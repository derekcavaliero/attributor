/*! 
 * attributor v0.1.0
 * 
 * 
 * Copyright (c) 2018 Derek Cavaliero @ WebMechanix
 * 
 * Date: 2019-03-05 08:22:34 EST 
 */
function Attributor(cookieDomain, fieldMap) {
    JSON.parse && JSON.stringify && (this.cookieDomain = cookieDomain || window.location.hostname, 
    this.fieldMap = fieldMap || {
        first: {
            source: "source_first",
            medium: "medium_first",
            campaign: "campaign_first",
            term: "term_first",
            content: "content_first",
            lp: "lp_first",
            date: "date_first"
        },
        last: {
            source: "source_last",
            medium: "medium_last",
            campaign: "campaign_last",
            term: "term_last",
            content: "content_last",
            lp: "lp_last",
            date: "date_last"
        }
    }, this.referrer = this.objectifyUrl(document.referrer), this.params = this.getUrlParams(), 
    this.updateAttrCookies(), this.fillFormFields());
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
    fillFormFields: function() {
        var storage = {
            first: this.getCookie("attr_first"),
            last: this.getCookie("attr_last")
        };
        for (var key in this.fieldMap) if (this.fieldMap.hasOwnProperty(key)) for (var prop in this.fieldMap[key]) if (this.fieldMap[key].hasOwnProperty(prop)) {
            var fields = document.getElementsByName(this.fieldMap[key][prop]);
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
        for (var utms = [ "source", "medium", "campaign", "term", "content" ], forceLastTouchUpdate = !(!this.params.utm_source && !this.params.utm_medium), i = 0; i < utms.length; i++) this.params["utm_" + utms[i]] && (data[utms[i]] = this.params["utm_" + utms[i]]);
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