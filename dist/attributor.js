/*! 
 * attributor.js v2.1.1 
 * https://github.com/derekcavaliero/attributor
 * © 2018-2024 Derek Cavaliero @ LEVEL
 * Updated: 2024-11-13 10:41:56 PST 
 */
Attributor = function(config) {
    var _defaults = {
        cookieDomain: location.hostname,
        cookieNames: {
            first: "attr_first",
            last: "attr_last"
        },
        decorateHostnames: [],
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
                id: "utm_id_1st",
                adextension: "utm_adextension_1st",
                adgroup: "utm_adgroup_1st",
                adgroupid: "utm_adgroupid_1st",
                adplacement: "utm_adplacement_1st",
                adposition: "utm_adposition_1st",
                campaignid: "utm_campaignid_1st",
                geo: "utm_geo_1st",
                keymatch: "utm_keymatch_1st",
                device: "utm_device_1st",
                matchtype: "utm_matchtype_1st",
                network: "utm_network_1st"
            },
            last: {
                source: "utm_source",
                medium: "utm_medium",
                campaign: "utm_campaign",
                id: "utm_id",
                term: "utm_term",
                content: "utm_content",
                source_platform: "utm_source_platform",
                marketing_tactic: "utm_marketing_tactic",
                creative_format: "utm_creative_format",
                adextension: "utm_adextension",
                adgroup: "utm_adgroup",
                adgroupid: "utm_adgroupid",
                adplacement: "utm_adplacement",
                adposition: "utm_adposition",
                campaignid: "utm_campaignid",
                geo: "utm_geo",
                keymatch: "utm_keymatch",
                device: "utm_device",
                matchtype: "utm_matchtype",
                network: "utm_network"
            },
            cookies: null,
            globals: null
        },
        fieldDataAttribute: "data-attributor-field",
        fieldTargetMethod: [ "name" ],
        filters: {},
        nullValue: "(not set)",
        sessionTimeout: 30
    };
    console.time("Attributor.js"), config.fieldTargetMethod = Array.isArray(config.fieldTargetMethod) ? config.fieldTargetMethod : [ config.fieldTargetMethod ], 
    this.config = this.deepMerge(_defaults, config), this.referrer = this.setReferrer(), 
    this.parameters = this.setParameters(), this.session = {
        first: this.getCookie(this.config.cookieNames.first) || !1,
        last: this.getCookie(this.config.cookieNames.last) || !1
    }, this.updateSession(), this.fillFormFields(), this.setEventListeners(), console.timeEnd("Attributor.js");
}, Attributor.prototype = {
    deepMerge: function(target, source) {
        for (var prop in source) source.hasOwnProperty(prop) && source[prop] instanceof Object && Object.assign(source[prop], this.deepMerge(target[prop], source[prop]));
        return Object.assign(target || {}, source), target;
    },
    grab: function(sessionMode) {
        var sessionMode = "undefined" != typeof sessionMode ? sessionMode : "all", data = {
            cookies: this.getCookieValues(),
            globals: this.getGlobalValues()
        };
        for (var key in this.config.fieldMap) if (this.config.fieldMap.hasOwnProperty(key) && data.hasOwnProperty(key)) for (var prop in this.config.fieldMap[key]) this.config.fieldMap[key].hasOwnProperty(prop) && (data[key][prop] && data[key][prop] != this.config.nullValue && (data[key][this.config.fieldMap[key][prop]] = data[key][prop]), 
        delete data[key][prop]);
        var sessionData = {};
        return "all" == sessionMode ? sessionData = this.session : [ "first", "last" ].indexOf(sessionMode) > -1 && (sessionData = this.session[sessionMode]), 
        Object.assign({
            session: sessionData
        }, data.cookies, data.globals);
    },
    fillFormFields: function(settings) {
        var _self = this, settings = "object" == typeof settings ? settings : {};
        settings.hasOwnProperty("targetMethod") && (settings.targetMethod = Array.isArray(settings.targetMethod) ? settings.targetMethod : [ settings.targetMethod ]);
        var query = {
            targetMethod: settings.targetMethod || this.config.fieldTargetMethod,
            scope: settings.scope || document
        }, data = {
            _params: this.params,
            first: this.session.first,
            last: this.session.last,
            cookies: this.getCookieValues(),
            globals: this.getGlobalValues()
        };
        for (var key in this.config.fieldMap) if (this.config.fieldMap.hasOwnProperty(key)) for (var prop in this.config.fieldMap[key]) if (this.config.fieldMap[key].hasOwnProperty(prop)) {
            var fields, field = this.config.fieldMap[key][prop], querySelector = [];
            if (query.targetMethod.forEach(function(method) {
                var selectors = {
                    "class": "input." + field,
                    parentClass: "." + field + " input",
                    dataAttribute: "input[" + _self.config.fieldDataAttribute + '="' + field + '"]',
                    name: 'input[name="' + field + '"]'
                };
                querySelector.push(selectors[method] || selectors.name);
            }), fields = query.scope.querySelectorAll(querySelector.join(","))) for (var i = 0; i < fields.length; i++) data[key].hasOwnProperty(prop) && "" != data[key][prop] && (fields[i].value = data[key][prop], 
            fields[i].dispatchEvent(new Event("input", {
                bubbles: !0
            })));
        }
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
            globals[prop] = "function" == typeof this.config.filters[prop] ? this.config.filters[prop](this.resolve(prop)) : this.resolve(prop);
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
        var parameterKeys = Object.keys(this.config.fieldMap.last);
        if (parameterKeys.forEach(function(item) {
            var parameter = "utm_" + item;
            _self.parameters.has(parameter) && (parsed[item] = _self.parameters.get(parameter));
        }), !this.parameters.has("utm_source") && !this.parameters.has("utm_medium")) {
            var cpc = {
                google: [ "gclid", "gclsrc", "dclid", "wbraid", "gbraid", "gad_source" ],
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
        function fillBeforeSubmit(e) {
            e.target.matches('[type="submit"]') && _self.fillFormFields({
                scope: e.target.form || e.target.closest("form")
            });
        }
        function decorateLinks(e) {
            if (e.target.matches("a") && e.target.href) {
                var url = new URL(e.target.href);
                if (_self.config.decorateHostnames.indexOf(url.hostname) !== -1) {
                    var parameterKeys = Object.keys(_self.config.fieldMap.last);
                    parameterKeys.forEach(function(param) {
                        _self.session.last[param] !== _self.config.nullValue && url.searchParams.set("utm_" + param, _self.session.last[param]);
                    }), e.target.href = url.toString();
                }
            }
        }
        var _self = this;
        if (this.config.enableSpaSupport) {
            this.monkeyPatchHistory();
            var handleSpaNavigation = function(e) {
                _self.setReferrer(!0), _self.updateSession();
            };
            window.addEventListener("popstate", handleSpaNavigation), window.onpopstate = history.onpushstate = handleSpaNavigation;
        }
        document.addEventListener("click", fillBeforeSubmit), document.addEventListener("click", decorateLinks);
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
        var _self = this, data = {
            source: "(direct)",
            medium: "(none)"
        };
        Object.keys(this.config.fieldMap.last).forEach(function(parameter) {
            [ "source", "medium" ].includes(parameter) || (data[parameter] = _self.config.nullValue);
        });
        var parameters = this.parseParameters(), referrer = parameters.hasOwnProperty("source") && parameters.hasOwnProperty("medium") ? {} : this.parseReferrer();
        Object.assign(data, referrer, parameters), this.session.first ? data = this.session.last && "(direct)" === data.source ? this.session.last : data : (this.session.first = data, 
        this.setCookie(this.config.cookieNames.first, data, 400, "days")), this.session.last = data, 
        this.setCookie(this.config.cookieNames.last, data, this.config.sessionTimeout);
    }
};