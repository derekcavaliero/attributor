window.Attributor = function( cookieDomain, customFieldMap, fieldTargetMethod ) {

    // Gracefully terminate if native JSON parsing/serialization isn't available
    if ( !JSON.parse || !JSON.stringify )
        return;

    this.cookieDomain = cookieDomain || window.location.hostname;

    var defaultFieldMap = {
        first: {
            source: 'utm_source_1st',
            medium: 'utm_medium_1st',
            campaign: 'utm_campaign_1st',
            term: 'utm_term_1st',
            content: 'utm_content_1st',
            adgroup: 'utm_adgroup_1st',
            gclid: 'gclid_1st',
            fbclid: 'fbclid_1st',
            lp: 'lp_1st',
            date: 'date_1st'
        },
        last: {
            source: 'utm_source',
            medium: 'utm_medium',
            campaign: 'utm_campaign',
            term: 'utm_term',
            content: 'utm_content',
            adgroup: 'utm_adgroup',
            gclid: 'gclid',
            fbclid: 'fbclid',
            lp: 'lp_last',
            date: 'date_last'
        },
	    cookies: {
	        _ga: 'ga',
	        _fbp: 'fbp',
	        _fbc: 'fbc'
	    },
	    globals: {
	       'navigator.userAgent': 'user_agent'
	    }
    };

    this.fieldMap = defaultFieldMap;

    if ( typeof customFieldMap === 'object' && customFieldMap !== null ) {

        for ( var key in defaultFieldMap ) {

            if ( !defaultFieldMap.hasOwnProperty( key ) ) continue;

            if ( !customFieldMap.hasOwnProperty( key ) ) {
                customFieldMap[key] = defaultFieldMap[key];
                continue;
            }

            for ( var prop in defaultFieldMap[key] ) {

                if ( !defaultFieldMap[key].hasOwnProperty( prop ) ) continue;

                if ( !customFieldMap[key].hasOwnProperty( prop ) ) {
                    customFieldMap[key][prop] = defaultFieldMap[key][prop];
                }
            }
        }

        this.fieldMap = customFieldMap;

    }

    this.fieldTargetMethod = fieldTargetMethod || 'name';

    this.referrer = this.objectifyUrl( document.referrer );
    this.params = this.getUrlParams();

    this.updateAttrCookies();
    this.fillFormFields();

}

Attributor.prototype = {

    objectifyUrl: function(referrer) {

        var parser = document.createElement( 'a' );
        parser.href = referrer;

        return {
            hostname: parser.hostname,
            href: parser.href,
            params: this.getUrlParams( parser.href )
        };
    },

    formatDate: function() {

        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        mm = ( mm < 10 ) ? '0' + mm : mm;
        var yyyy = today.getFullYear();

        return yyyy + '-' + mm + '-' + dd;

    },

    fillFormFields: function( targetMethod ) {

        var targetMethod = typeof targetMethod !== 'undefined' ? targetMethod : this.fieldTargetMethod;

        var storage = {
            first: this.getCookie( 'attr_first' ),
            last: this.getCookie( 'attr_last' ),
            cookies: this.getCookieValues(),
            globals: this.getGlobalValues()
        };

        for ( var key in this.fieldMap ) {

            if ( !this.fieldMap.hasOwnProperty( key ) ) continue;

            for ( var prop in this.fieldMap[key] ) {

                if ( !this.fieldMap[key].hasOwnProperty( prop ) ) continue;

                var fields;

                switch ( targetMethod ) {

                    case 'class':
                        fields = document.querySelectorAll( 'input.' + this.fieldMap[key][prop] );
                    break;

                    case 'parentClass':
                        fields = document.querySelectorAll( '.' + this.fieldMap[key][prop] + ' input' );
                    break;

                    case 'name':
                    default:
                        fields = document.getElementsByName( this.fieldMap[key][prop] );
                    break;

                }

                if ( fields ) {
                    for ( var i = 0; i < fields.length; i++ ) {
                        if ( storage[key].hasOwnProperty(prop) )
                            fields[i].value = storage[key][prop];
                    }
                }

            }

        }

    },

    updateAttrCookies: function() {

        var data = {
            source: '(direct)',
            medium: '(none)',
            campaign: '(not set)',
            term: '(not provided)',
            content: '(not set)',
            adgroup: '',
            gclid: '',
            fbclid: '',
            lp: window.location.hostname + window.location.pathname,
            date: this.formatDate(),
            timestamp: Date.now()
        };

        // These are just some common referrers that we can parse easily into either organic or social. Expanding this list probably isn't necessary -
        // the most important mediums are paid and organic (social is also a nice one to have because theres a set # of relevant social platforms)
        var referrers = {
            organic: [
                'www.google.com',
                'www.bing.com',
                'www.yahoo.com',
                'www.ask.com',
                'search.aol.com',
                'www.baidu.com',
                'www.wolframalpha.com',
                'duckduckgo.com',
                'www.yandex.com'
            ],
            social: [
                'www.linkedin.com',
                'www.facebook.com',
                't.co',
                'l.instagram.com'
            ]
        };

        // Referrer parsing notes
        //
        // These common URL shorteners don't pass proper document.referrer values:
        // - t.co
        // - hubs.ly
        // - lnkd.in
        //
        // If the document.referrer is the same TLD as the cookieDomain then we can only assume its direct - UNLESS there are utm_ parameters that determine otherwise
        if ( document.referrer && ( this.referrer.hostname.indexOf( this.cookieDomain ) === -1 ) ) {

            var parsedSource = false;
            var parsedMedium = false;

            for ( var key in referrers ) {

                if ( parsedSource )
                    break;

                if ( !referrers.hasOwnProperty( key ) ) continue;

                for ( var i = 0; i < referrers[key].length; i++ ) {

                    if ( this.referrer.hostname.indexOf( referrers[key][i] ) > -1 ) {

                        var sourceParts = referrers[key][i].split( '.' );

                        // This is an assumption that most urls we'll want to part will only have 0-1 subdomains and exist on a TLD that doesn't contain 2 . (e.g: .co.uk)
                        parsedSource = ( sourceParts.length == 2 ) ? sourceParts[0] : sourceParts[1];
                        parsedMedium = key;

                        break;

                    }

                }

            }

            data.source = ( parsedSource ) ? parsedSource : this.referrer.hostname;
            data.medium = ( parsedMedium ) ? parsedMedium : 'referral';

        }

        // UTM parsing
        //
        // UTMs always take precedence over any referral parsing or direct traffic
        var utms = [
            'source', 'medium', 'campaign', 'term', 'content', 'adgroup'
        ];

        // @TODO: IF Source/Medium params have value(s) force reset attr_last cookie.

        var forceLastTouchUpdate = ( this.params.utm_source || this.params.utm_medium ) ? true : false;

        for ( var i = 0; i < utms.length; i++ ) {
            if ( this.params['utm_' + utms[i]] )
                data[utms[i]] = this.params['utm_' + utms[i]];
        }

        // Forcing proper source/mediums for GoogleAds/Facebook fb/g clid autotagging in case manual UTM tagging hasn't been implemented
        if ( !this.params.utm_source && !this.params.utm_medium ) {

            if ( this.params.gclid || this.params.fbclid ) {
                data.medium = 'cpc';
                forceLastTouchUpdate = true;
            }

            if ( this.params.gclid ) {
                data.source = 'google';
                data.gclid = this.params.gclid;
            }

            if ( this.params.fbclid ) {
                data.source = 'facebook';
                data.fbclid = this.params.fbclid;
            }

        }

        if ( this.params.gclid )
            data.gclid = this.params.gclid;
        
        if ( this.params.fbclid )
            data.fbclid = this.params.fbclid;

        if ( this.checkCookie( 'attr_first' ) ) {

            var storedLastTouchData = ( this.checkCookie( 'attr_last' ) ) ? this.getCookie( 'attr_last' ) : false;

            // Only overwrite last touch if 30 minutes has ellapsed OR if source/medium params are present
            if ( !storedLastTouchData || forceLastTouchUpdate ) {
                this.setCookie( 'attr_last', data, 30 );
            } else {
                this.setCookie( 'attr_last', storedLastTouchData, 30 );
            }

        } else {
            this.setCookie( 'attr_first', data, 730, 'days' );
            this.setCookie( 'attr_last', data, 30 );
        }

    },

    checkCookie: function( name ) {

        name = this.getCookie( name );

        return ( ( name != null && name != '' ) ? true : false );

	  },

    getCookie: function( name, decode ) {   
	    
	    decode = (typeof decode !== 'undefined') ? decode : true;

        if ( document.cookie.length > 0 ) {

            var start = document.cookie.indexOf( name + '=' );

            if ( start != -1 ) {

                start = start + name.length + 1;

                var end = document.cookie.indexOf( ';', start );

                if ( end == -1 ) {
                    end = document.cookie.length;
                }
                
                var value = document.cookie.substring( start, end );
                
                if (decode)
                	return JSON.parse( decodeURIComponent( value ) );
                	
                return value;

            }
        }

        return '';

    },

    setCookie: function( name, value, expiresIn, expiresInUnits ) {

        expiresInUnits = (typeof expiresInUnits !== 'undefined') ?  expiresInUnits : 'minutes';

        var expireDate = new Date();

        if ( 'days' == expiresInUnits )
            expireDate.setDate( expireDate.getDate() + expiresIn );

        if ( 'minutes' == expiresInUnits ) {
            expireDate.setTime( expireDate.getTime() + ( expiresIn * 60 * 1000 ) );
        }

        document.cookie = name + '=' + encodeURIComponent( JSON.stringify( value ) ) + ( ( expiresIn == null ) ? '' : '; domain=.' + this.cookieDomain + '; expires=' + expireDate.toUTCString() ) + '; path=/';

    },
    
    getCookieValues: function() {
	    
	    var cookies = {};
	    
	    for ( var prop in this.fieldMap.cookies ) {
		    
		    if ( !this.fieldMap.cookies.hasOwnProperty(prop) )
		    	continue;
		    
		    cookies[prop] = this.getCookie(prop, false);
		    
	    }
	    
	    return cookies;
	    
    },
    
    getGlobalValues: function() {
	    
	    var globals = {};
	    
	    for ( var prop in this.fieldMap.globals ) {
		    
		    if ( !this.fieldMap.globals.hasOwnProperty(prop) )
		    	continue;
		    	
		    var global = prop.split('.');
		    
		    globals[prop] = window[global[0]][global[1]];
		    
	    }
	    
	    return globals;
	    
    },

    getUrlParams: function( url ) {

        var params = {};
        var parser = document.createElement( 'a' );
        parser.href = url || window.location.href;

        if ( !parser.search )
            return false;

        var query = parser.search.substring( 1 );
        var vars = query.split( '&' );

        for ( var i = 0; i < vars.length; i++ ) {
            var pair = vars[i].split( '=' );
            params[pair[0]] = decodeURIComponent( pair[1] );
        }

        return params;

    }

};
