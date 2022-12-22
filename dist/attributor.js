/*! 
 * attributor.js v2.0 
 * https://github.com/derekcavaliero/attributor
 * © 2018-2022 Derek Cavaliero @ WebMechanix
 * Updated: 2022-12-21 18:44:09 PST 
 */
Attributor = function(config) {
    var _defaults = {
        cookieDomain: location.hostname,
        cookieNames: {
            first: "attr_first",
            last: "attr_last"
        },
        enableSpaSupport: !1,
        fieldMap: {
            first: {
                source: "utm_source_1st",
                medium: "utm_medium_1st",
                campaign: "utm_campaign_1st",
                term: "utm_term_1st",
                content: "utm_content_1st",
                source_platform: "utm_source_platform_1st",
                marketing_tactic: "utm_marketing_tactic_1st",
                creative_format: "utm_creative_format_1st",
                adgroup: "utm_adgroup_1st",
                lp: "lp_1st",
                date: "date_1st"
            },
            last: {
                source: "utm_source",
                medium: "utm_medium",
                campaign: "utm_campaign",
                term: "utm_term",
                content: "utm_content",
                source_platform: "utm_source_platform",
                marketing_tactic: "utm_marketing_tactic",
                creative_format: "utm_creative_format",
                adgroup: "utm_adgroup",
                lp: "lp_last",
                date: "date_last"
            },
            cookies: {
                _fbc: "fbc",
                _fbp: "fbp",
                _ga: "ga",
                _gcl_aw: "gclid",
                _uetmsclkid: "msclkid",
                li_fat_id: "li_fat_id",
                ttclid: "ttclid"
            },
            globals: {
                "navigator.userAgent": "user_agent",
                "location.href": "conversion_url",
                "document.referrer": "referrer"
            }
        },
        fieldTargetMethod: "name",
        filters: {
            _ga: function(val) {
                return val.split(".").slice(2).join(".");
            },
            _gcl_aw: function(val) {
                return val.split(".").slice(2).join(".");
            },
            _uetmsclkid: function(val) {
                return val.slice(4);
            }
        },
        sessionTimeout: 30
    };
    this.config = this.deepMerge(_defaults, config), this.referrer = this.setReferrer(), 
    this.parameters = this.setParameters(), this.session = {
        first: this.getCookie(this.config.cookieNames.first) || !1,
        last: this.getCookie(this.config.cookieNames.last) || !1
    }, this.updateSession(), this.fillFormFields(), this.setEventListeners();
}, Attributor.prototype = {
    deepMerge: function(target, source) {
        for (var prop in source) source.hasOwnProperty(prop) && source[prop] instanceof Object && Object.assign(source[prop], this.deepMerge(target[prop], source[prop]));
        return Object.assign(target || {}, source), target;
    },
    fillFormFields: function(targetMethod) {
        var targetMethod = "undefined" != typeof targetMethod ? targetMethod : this.config.fieldTargetMethod, data = {
            _params: this.params,
            first: this.session.first,
            last: this.session.last,
            cookies: this.getCookieValues(),
            globals: this.getGlobalValues()
        };
        for (var key in this.config.fieldMap) if (this.config.fieldMap.hasOwnProperty(key)) for (var prop in this.config.fieldMap[key]) if (this.config.fieldMap[key].hasOwnProperty(prop)) {
            var fields, field = this.config.fieldMap[key][prop];
            switch (targetMethod) {
              case "class":
                fields = document.querySelectorAll("input." + field);
                break;

              case "parentClass":
                fields = document.querySelectorAll("." + field + " input");
                break;

              case "name":
              default:
                fields = document.getElementsByName(field);
            }
            if (fields) for (var i = 0; i < fields.length; i++) data[key].hasOwnProperty(prop) && "" != data[key][prop] && (fields[i].value = data[key][prop]);
        }
    },
    formatDate: function() {
        var today = new Date(), dd = today.getDate(), mm = today.getMonth() + 1;
        mm = mm < 10 ? "0" + mm : mm;
        var yyyy = today.getFullYear();
        return yyyy + "-" + mm + "-" + dd;
    },
    getCookie: function(name, decode) {
        var decode = "undefined" == typeof decode || decode, value = "";
        if (document.cookie.length > 0) {
            var start = document.cookie.indexOf(name + "=");
            if (start != -1) {
                start = start + name.length + 1;
                var end = document.cookie.indexOf(";", start);
                end == -1 && (end = document.cookie.length), value = document.cookie.substring(start, end), 
                decode && (value = JSON.parse(decodeURIComponent(value)));
            }
        }
        return value;
    },
    getCookieValues: function() {
        var cookies = {};
        for (var prop in this.config.fieldMap.cookies) this.config.fieldMap.cookies.hasOwnProperty(prop) && (cookies[prop] = "function" == typeof this.config.filters[prop] ? this.config.filters[prop](this.getCookie(prop, !1)) : this.getCookie(prop, !1));
        return cookies;
    },
    getGlobalValues: function() {
        var globals = {};
        for (var prop in this.config.fieldMap.globals) if (this.config.fieldMap.globals.hasOwnProperty(prop)) try {
            globals[prop] = this.resolve(prop);
        } catch (err) {}
        return globals;
    },
    monkeyPatchHistory: function() {
        console.warn("Attributor.js: config.enableSpaSupport = true monkeypatches the the history.pushState() method.");
        var pushState = history.pushState;
        history.pushState = function(state) {
            return "function" == typeof history.onpushstate && history.onpushstate({
                state: state
            }), pushState.apply(history, arguments);
        };
    },
    parseParameters: function() {
        var _self = this, parsed = {};
        if (!this.parameters) return parsed;
        if ([ "source", "medium", "campaign", "term", "content", "source_platform", "marketing_tactic", "creative_format", "adgroup" ].forEach(function(item) {
            var parameter = "utm_" + item;
            _self.parameters.has(parameter) && (parsed[item] = _self.parameters.get(parameter));
        }), !this.parameters.has("utm_source") && !this.parameters.has("utm_medium")) {
            var cpc = {
                google: [ "gclid", "gclsrc", "dclid" ],
                facebook: "fbclid",
                bing: "msclkid",
                linkedin: "li_fat_id",
                tiktok: "ttclid",
                twitter: "twclid"
            }, hasClickId = !1;
            for (var source in cpc) if (cpc.hasOwnProperty(source)) {
                var clickId = cpc[source];
                if (Array.isArray(clickId)) {
                    for (var i = 0; i < clickId.length; i++) if (this.parameters.has(clickId[i])) {
                        hasClickId = !0;
                        break;
                    }
                } else this.parameters.has(clickId) && (hasClickId = !0);
                if (hasClickId) {
                    parsed.source = source, parsed.medium = "cpc";
                    break;
                }
            }
        }
        return parsed;
    },
    parseReferrer: function(uri) {
        var referrer = uri ? new URL(uri) : this.referrer, parsed = {};
        if (!referrer || referrer.hostname.indexOf(this.config.cookieDomain) > -1) return parsed;
        parsed = {
            source: referrer.hostname,
            medium: "referral"
        };
        var rules = {
            organic: {
                google: "^www.(google).[a-z]{2,3}(?:.[a-z]{2})?$",
                bing: "^www.(bing).com$",
                duckduckgo: "^(duckduckgo).com$",
                yahoo: "^(?:www|m)?.?(yahoo).(?:com|cn)$",
                ecosia: "^www.(ecosia).org$",
                ask: "^www.(ask).com$",
                aol: "^(?:search.)?(aol).com$",
                baidu: "^www.(baidu).com$",
                xfinity: "^my|search.(xfinity).com",
                yandex: "^(?:www.)?(yandex).com|ru$",
                lycos: "^(?:www|search)?.?(lycos).[a-z]{2,3}(?:.[a-z]{2})?$"
            },
            social: {
                linkedin: "^www.(linkedin).com$",
                facebook: "^www.(facebook).com$",
                twitter: "^t.co$",
                instagram: "^l.(instagram).com$"
            }
        };
        for (var medium in rules) if (rules.hasOwnProperty(medium)) {
            for (var source in rules[medium]) if (rules[medium].hasOwnProperty(source)) {
                var check = referrer.hostname.match(rules[medium][source]);
                if (check) {
                    parsed.source = source, parsed.medium = medium;
                    break;
                }
            }
            if (Object.keys(rules).indexOf(parsed.medium) > -1) break;
        }
        return parsed;
    },
    resolve: function(path) {
        return path.split(".").reduce(function(prev, curr) {
            return prev ? prev[curr] : null;
        }, window);
    },
    setCookie: function(name, value, expires, units) {
        var units = "undefined" != typeof units ? units : "minutes", expireDate = new Date();
        "days" == units && expireDate.setDate(expireDate.getDate() + expires), "minutes" == units && expireDate.setTime(expireDate.getTime() + 60 * expires * 1e3), 
        document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + (null == expires ? "" : "; domain=." + this.config.cookieDomain + "; expires=" + expireDate.toUTCString()) + "; path=/";
    },
    setEventListeners: function() {
        var _self = this;
        if (this.config.enableSpaSupport) {
            this.monkeyPatchHistory();
            var handleSpaNavigation = function(e) {
                _self.setReferrer(!0), _self.updateSession();
            };
            window.addEventListener("popstate", handleSpaNavigation), window.onpopstate = history.onpushstate = handleSpaNavigation;
        }
        document.addEventListener("click", function(e) {
            e.target.matches('input[type="submit"], button[type="submit"]') && _self.fillFormFields();
        });
    },
    setParameters: function() {
        var url = new URL(location.href);
        return !!url.search && url.searchParams;
    },
    setReferrer: function(clear) {
        var referrer;
        return referrer = !clear && (!!document.referrer && new URL(document.referrer));
    },
    updateSession: function() {
        var data = {
            source: "(direct)",
            medium: "(none)",
            campaign: "(not set)",
            term: "(not provided)",
            content: "(not set)",
            source_platform: "(not set)",
            marketing_tactic: "(not set)",
            creative_format: "(not set)",
            adgroup: "(not set)",
            lp: window.location.hostname + window.location.pathname,
            date: this.formatDate(),
            timestamp: Date.now()
        }, parameters = this.parseParameters(), referrer = parameters.hasOwnProperty("source") && parameters.hasOwnProperty("medium") ? {} : this.parseReferrer();
        Object.assign(data, referrer, parameters), this.session.first ? data = this.session.last && "(direct)" === data.source ? this.session.last : data : (this.session.first = data, 
        this.setCookie(this.config.cookieNames.first, data, 400, "days")), this.session.last = data, 
        this.setCookie(this.config.cookieNames.last, data, this.config.sessionTimeout);
    }
};