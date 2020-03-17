/*! 
 * attributor v0.2.0
 * 
 * 
 * Copyright (c) 2018 Derek Cavaliero @ WebMechanix
 * 
 * Date: 2020-03-17 11:55:38 EDT 
 */
function Attributor(cookieDomain, customFieldMap, fieldTargetMethod) {
    if (JSON.parse && JSON.stringify) {
        this.cookieDomain = cookieDomain || window.location.hostname;
        var defaultFieldMap = {
            first: {
                source: "utm_source_1st",
                medium: "utm_medium_1st",
                campaign: "utm_campaign_1st",
                term: "utm_term_1st",
                content: "utm_content_1st",
                adgroup: "utm_adgroup_1st",
                gclid: "gclid_1st",
                lp: "lp_1st",
                date: "date_1st"
            },
            last: {
                source: "utm_source",
                medium: "utm_medium",
                campaign: "utm_campaign",
                term: "utm_term",
                content: "utm_content",
                adgroup: "utm_adgroup",
                gclid: "gclid",
                lp: "lp_last",
                date: "date_last"
            }
        };
        if (this.fieldMap = defaultFieldMap, "object" == typeof customFieldMap && null !== customFieldMap) {
            for (var key in defaultFieldMap) if (defaultFieldMap.hasOwnProperty(key)) if (customFieldMap.hasOwnProperty(key)) for (var prop in defaultFieldMap[key]) defaultFieldMap[key].hasOwnProperty(prop) && (customFieldMap[key].hasOwnProperty(prop) || (customFieldMap[key][prop] = defaultFieldMap[key][prop])); else customFieldMap[key] = defaultFieldMap[key];
            this.fieldMap = customFieldMap;
        }
        this.fieldTargetMethod = fieldTargetMethod || "name", this.referrer = this.objectifyUrl(document.referrer), 
        this.params = this.getUrlParams(), this.updateAttrCookies(), this.fillFormFields();
    }
}

Attributor.prototype = {
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
        var targetMethod = "undefined" != typeof targetMethod ? targetMethod : this.fieldTargetMethod, storage = {
            first: this.getCookie("attr_first"),
            last: this.getCookie("attr_last")
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
            if (fields) for (var i = 0; i < fields.length; i++) fields[i].value = storage[key][prop];
        }
    },
    updateAttrCookies: function() {
        var data = {
            source: "(direct)",
            medium: "(none)",
            campaign: "(not set)",
            term: "(not provided)",
            content: "(not set)",
            adgroup: "",
            gclid: "",
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
        for (var utms = [ "source", "medium", "campaign", "term", "content", "adgroup" ], forceLastTouchUpdate = !(!this.params.utm_source && !this.params.utm_medium), i = 0; i < utms.length; i++) this.params["utm_" + utms[i]] && (data[utms[i]] = this.params["utm_" + utms[i]]);
        if (this.params.utm_source || this.params.utm_medium || ((this.params.gclid || this.params.fbclid) && (data.medium = "cpc", 
        forceLastTouchUpdate = !0), this.params.gclid && (data.source = "google", data.gclid = this.params.gclid), 
        this.params.fbclid && (data.source = "facebook")), this.checkCookie("attr_first")) {
            var storedLastTouchData = !!this.checkCookie("attr_last") && this.getCookie("attr_last");
            !storedLastTouchData || forceLastTouchUpdate ? this.setCookie("attr_last", data, 30) : this.setCookie("attr_last", storedLastTouchData, 30);
        } else this.setCookie("attr_first", data, 730, "days"), this.setCookie("attr_last", data, 30);
    },
    checkCookie: function(name) {
        return name = this.getCookie(name), null != name && "" != name;
    },
    getCookie: function(name) {
        if (document.cookie.length > 0) {
            var start = document.cookie.indexOf(name + "=");
            if (start != -1) {
                start = start + name.length + 1;
                var end = document.cookie.indexOf(";", start);
                return end == -1 && (end = document.cookie.length), JSON.parse(decodeURIComponent(document.cookie.substring(start, end)));
            }
        }
        return "";
    },
    setCookie: function(name, value, expiresIn, expiresInUnits) {
        expiresInUnits = "undefined" != typeof expiresInUnits ? expiresInUnits : "minutes";
        var expireDate = new Date();
        "days" == expiresInUnits && expireDate.setDate(expireDate.getDate() + expiresIn), 
        "minutes" == expiresInUnits && expireDate.setTime(expireDate.getTime() + 60 * expiresIn * 1e3), 
        document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + (null == expiresIn ? "" : "; domain=." + this.cookieDomain + "; expires=" + expireDate.toUTCString()) + "; path=/";
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