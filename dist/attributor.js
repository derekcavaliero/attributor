/*! 
 * attributor v2.0
 * 
 * 
 * Copyright (c) 2018 Derek Cavaliero @ WebMechanix
 * 
 * Date: 2022-11-08 17:49:08 PST 
 */
window.Attributor = function(config) {
    if (JSON.parse && JSON.stringify) {
        var _self = this, defaultConfig = {
            cookieDomain: location.hostname,
            fieldTargetMethod: "name",
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
            }
        };
        this.config = this.merge(defaultConfig, config), this.fieldMap = this.config.fieldMap, 
        this.referrer = this.objectifyUrl(document.referrer), this.params = this.getUrlParams(), 
        this.updateAttrCookies(), this.fillFormFields(), document.addEventListener("click", function(e) {
            e.target.matches('input[type="submit"], button[type="submit"]') && _self.fillFormFields();
        });
    }
}, Attributor.prototype = {
    merge: function(target, source) {
        for (var prop in source) source.hasOwnProperty(prop) && source[prop] instanceof Object && Object.assign(source[prop], this.merge(target[prop], source[prop]));
        return Object.assign(target || {}, source), target;
    },
    objectifyUrl: function(referrer) {
        var parser = document.createElement("a");
        return parser.href = referrer, {
            hostname: parser.hostname,
            href: parser.href,
            params: this.getUrlParams(parser.href)
        };
    },
    formatDate: function() {
        var today = new Date(), dd = today.getDate(), mm = today.getMonth() + 1;
        mm = mm < 10 ? "0" + mm : mm;
        var yyyy = today.getFullYear();
        return yyyy + "-" + mm + "-" + dd;
    },
    fillFormFields: function(targetMethod) {
        var targetMethod = "undefined" != typeof targetMethod ? targetMethod : this.config.fieldTargetMethod, data = {
            _params: this.params,
            first: this.getCookie("attr_first"),
            last: this.getCookie("attr_last"),
            cookies: this.getCookieValues(),
            globals: this.getGlobalValues()
        };
        for (var key in this.fieldMap) if (this.fieldMap.hasOwnProperty(key)) for (var prop in this.fieldMap[key]) if (this.fieldMap[key].hasOwnProperty(prop)) {
            var fields;
            switch (targetMethod) {
              case "class":
                fields = document.querySelectorAll("input." + this.fieldMap[key][prop]);
                break;

              case "parentClass":
                fields = document.querySelectorAll("." + this.fieldMap[key][prop] + " input");
                break;

              case "name":
              default:
                fields = document.getElementsByName(this.fieldMap[key][prop]);
            }
            if (fields) for (var i = 0; i < fields.length; i++) data[key].hasOwnProperty(prop) && "" != data[key][prop] && (fields[i].value = data[key][prop]);
        }
    },
    updateAttrCookies: function() {
        var data = {
            source: "(direct)",
            medium: "(none)",
            campaign: "(not set)",
            term: "(not provided)",
            content: "(not set)",
            source_platform: "(not set)",
            marketing_tactic: "(not set)",
            creative_format: "(not set)",
            adgroup: "",
            lp: window.location.hostname + window.location.pathname,
            date: this.formatDate(),
            timestamp: Date.now()
        }, referrers = {
            organic: [ "www.google.com", "www.bing.com", "www.yahoo.com", "www.ask.com", "search.aol.com", "www.baidu.com", "www.wolframalpha.com", "duckduckgo.com", "www.yandex.com" ],
            social: [ "www.linkedin.com", "www.facebook.com", "t.co", "l.instagram.com" ]
        };
        if (document.referrer && this.referrer.hostname.indexOf(this.cookieDomain) === -1) {
            var parsedSource = !1, parsedMedium = !1;
            for (var key in referrers) {
                if (parsedSource) break;
                if (referrers.hasOwnProperty(key)) for (var i = 0; i < referrers[key].length; i++) if (this.referrer.hostname.indexOf(referrers[key][i]) > -1) {
                    var sourceParts = referrers[key][i].split(".");
                    parsedSource = 2 == sourceParts.length ? sourceParts[0] : sourceParts[1], parsedMedium = key;
                    break;
                }
            }
            data.source = parsedSource ? parsedSource : this.referrer.hostname, data.medium = parsedMedium ? parsedMedium : "referral";
        }
        for (var utms = [ "source", "medium", "campaign", "term", "content", "source_platform", "marketing_tactic", "creative_format", "adgroup" ], forceLastTouchUpdate = !(!this.params.utm_source && !this.params.utm_medium), i = 0; i < utms.length; i++) this.params["utm_" + utms[i]] && (data[utms[i]] = this.params["utm_" + utms[i]]);
        if (this.params.utm_source || this.params.utm_medium || ((this.params.gclid || this.params.fbclid) && (data.medium = "cpc", 
        forceLastTouchUpdate = !0), this.params.gclid && (data.source = "google"), this.params.fbclid && (data.source = "facebook")), 
        this.checkCookie("attr_first")) {
            var storedLastTouchData = !!this.checkCookie("attr_last") && this.getCookie("attr_last");
            !storedLastTouchData || forceLastTouchUpdate ? this.setCookie("attr_last", data, 30) : this.setCookie("attr_last", storedLastTouchData, 30);
        } else this.setCookie("attr_first", data, 730, "days"), this.setCookie("attr_last", data, 30);
    },
    checkCookie: function(name) {
        return name = this.getCookie(name), null != name && "" != name;
    },
    getCookie: function(name, decode) {
        if (decode = "undefined" == typeof decode || decode, document.cookie.length > 0) {
            var start = document.cookie.indexOf(name + "=");
            if (start != -1) {
                start = start + name.length + 1;
                var end = document.cookie.indexOf(";", start);
                end == -1 && (end = document.cookie.length);
                var value = document.cookie.substring(start, end);
                return decode ? JSON.parse(decodeURIComponent(value)) : value;
            }
        }
        return "";
    },
    setCookie: function(name, value, expiresIn, expiresInUnits) {
        expiresInUnits = "undefined" != typeof expiresInUnits ? expiresInUnits : "minutes";
        var expireDate = new Date();
        "days" == expiresInUnits && expireDate.setDate(expireDate.getDate() + expiresIn), 
        "minutes" == expiresInUnits && expireDate.setTime(expireDate.getTime() + 60 * expiresIn * 1e3), 
        document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + (null == expiresIn ? "" : "; domain=." + this.config.cookieDomain + "; expires=" + expireDate.toUTCString()) + "; path=/";
    },
    getCookieValues: function() {
        var cookies = {};
        for (var prop in this.fieldMap.cookies) this.fieldMap.cookies.hasOwnProperty(prop) && (cookies[prop] = this.config.filters[prop] ? this.config.filters[prop](this.getCookie(prop, !1)) : this.getCookie(prop, !1));
        return cookies;
    },
    getGlobalValues: function() {
        var globals = {};
        for (var prop in this.fieldMap.globals) if (this.fieldMap.globals.hasOwnProperty(prop)) {
            var global = prop.split(".");
            try {
                globals[prop] = window[global[0]][global[1]];
            } catch (err) {}
        }
        return globals;
    },
    getUrlParams: function(url) {
        var params = {}, parser = document.createElement("a");
        if (parser.href = url || window.location.href, !parser.search) return !1;
        for (var query = parser.search.substring(1), vars = query.split("&"), i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            params[pair[0]] = decodeURIComponent(pair[1]);
        }
        return params;
    }
};