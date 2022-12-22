Attributor = function(config) {

  var _defaults = {
    cookieDomain: location.hostname,
    cookieNames: {
      first: 'attr_first',
      last: 'attr_last'
    },
    enableSpaSupport: false,
    fieldMap: {
      first: {
        source: 'utm_source_1st',
        medium: 'utm_medium_1st',
        campaign: 'utm_campaign_1st',
        term: 'utm_term_1st',
        content: 'utm_content_1st',
        source_platform: 'utm_source_platform_1st',
        marketing_tactic: 'utm_marketing_tactic_1st',
        creative_format: 'utm_creative_format_1st',
        adgroup: 'utm_adgroup_1st',
        lp: 'lp_1st',
        date: 'date_1st'
      },
      last: {
        source: 'utm_source',
        medium: 'utm_medium',
        campaign: 'utm_campaign',
        term: 'utm_term',
        content: 'utm_content',
        source_platform: 'utm_source_platform',
        marketing_tactic: 'utm_marketing_tactic',
        creative_format: 'utm_creative_format',
        adgroup: 'utm_adgroup',
        lp: 'lp_last',
        date: 'date_last'
      },
      cookies: {
        _fbc: 'fbc',            // Facebook Ads Click ID
        _fbp: 'fbp',            // Facebook Ads Browser ID
        _ga: 'ga',              // Google Analytics Client ID
        _gcl_aw: 'gclid',       // Google Ads Click ID
        _uetmsclkid: 'msclkid', // Bing/Microsoft Ads Click ID
        li_fat_id: 'li_fat_id', // LinkedIn Click ID
        ttclid: 'ttclid'        // TikTok Ads Click ID
      },
      globals: {
        'navigator.userAgent': 'user_agent',
        'location.href': 'conversion_url',
        'document.referrer': 'referrer'
      }
    },
    fieldTargetMethod: 'name',
    filters: {
      _ga: function(val) {
        // e.g: GA1.2.1234567890.0987654321
        // Should return 1234567890.0987654321
        return val.split('.').slice(2).join('.');
      },
      _gcl_aw: function(val) {
        // e.g: GCL.1645197936.xxxxxxxGCLIDxxxxxxx
        // Should return xxxxxxxGCLIDxxxxxxx
        return val.split('.').slice(2).join('.');
      },
      _uetmsclkid: function(val) {
        // e.g: _uetxxxxxxxMSCLKIDxxxxxxx
        // Should return xxxxxxxMSCLKIDxxxxxxx
        return val.slice(4);
      }
    },
    sessionTimeout: 30
  };
  
  this.config = this.deepMerge(_defaults, config);

  this.referrer = this.setReferrer();
  this.parameters = this.setParameters();

  this.session = {
    first: this.getCookie(this.config.cookieNames.first) || false,
    last: this.getCookie(this.config.cookieNames.last) || false
  };

  this.updateSession();
  this.fillFormFields();
  this.setEventListeners();

}

Attributor.prototype = {

  deepMerge: function(target, source) {

    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (var prop in source) {

      if (!source.hasOwnProperty(prop))
        continue;

      if (source[prop] instanceof Object) 
        Object.assign(source[prop], this.deepMerge(target[prop], source[prop]));

    }

    // Join `target` and modified `source`
    Object.assign(target || {}, source);

    return target;

  },

  fillFormFields: function(targetMethod)  {

    var targetMethod = typeof targetMethod !== 'undefined' ? targetMethod : this.config.fieldTargetMethod;

    var data = {
      _params: this.params,
      first: this.session.first,
      last: this.session.last,
      cookies: this.getCookieValues(),
      globals: this.getGlobalValues()
    };

    for (var key in this.config.fieldMap) {

      if (!this.config.fieldMap.hasOwnProperty(key)) 
        continue;

      for (var prop in this.config.fieldMap[key]) {

        if (!this.config.fieldMap[key].hasOwnProperty(prop)) 
          continue;

        var fields;
        var field = this.config.fieldMap[key][prop];

        switch (targetMethod) {

          case 'class':
            fields = document.querySelectorAll('input.' + field);
          break;

          case 'parentClass':
            fields = document.querySelectorAll('.' + field + ' input');
          break;

          case 'name':
          default:
            fields = document.getElementsByName(field);
          break;

        }

        if (!fields)
          continue;
        
        for (var i = 0; i < fields.length; i++) {
          if (data[key].hasOwnProperty(prop) && data[key][prop] != '')
            fields[i].value = data[key][prop];
        }
      

      }

    }

  },

  formatDate: function() {

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!

    mm = ( mm < 10 ) ? '0' + mm : mm;
    var yyyy = today.getFullYear();

    return yyyy + '-' + mm + '-' + dd;

  },

  getCookie: function(name, decode) {   
    
    var decode = typeof decode !== 'undefined' ? decode : true;
    var value = '';

    if (document.cookie.length > 0) {

      var start = document.cookie.indexOf(name + '=');

      if (start != -1) {

        start = start + name.length + 1;

        var end = document.cookie.indexOf(';', start);

        if (end == -1)
          end = document.cookie.length;
        
        value = document.cookie.substring(start, end);
        
        if (decode)
          value = JSON.parse(decodeURIComponent(value));
 
      }

    }

    return value;

  },
  
  getCookieValues: function() {
    
    var cookies = {};
    
    for (var prop in this.config.fieldMap.cookies) {
      
      if (!this.config.fieldMap.cookies.hasOwnProperty(prop))
        continue;
      
      cookies[prop] = typeof this.config.filters[prop] === 'function' ? this.config.filters[prop](this.getCookie(prop, false)) : this.getCookie(prop, false);
      
    }
    
    return cookies;
    
  },
  
  getGlobalValues: function() {
    
    var globals = {};
    
    for (var prop in this.config.fieldMap.globals) {
      
      if (!this.config.fieldMap.globals.hasOwnProperty(prop))
        continue;
      
      try{
        globals[prop] = this.resolve(prop);
      } catch(err){}
      
    }
    
    return globals;
    
  },

  monkeyPatchHistory: function() {

    console.warn('Attributor.js: config.enableSpaSupport = true monkeypatches the the history.pushState() method.')

    var pushState = history.pushState;

    history.pushState = function(state) {
      
      if (typeof history.onpushstate == 'function') {
        history.onpushstate({
            state: state
        });
      }
      
      return pushState.apply(history, arguments);

    };

  },

  parseParameters: function() {

    var _self = this;

    var parsed = {};

    if (!this.parameters)
      return parsed;
    
    [
      'source', 
      'medium', 
      'campaign', 
      'term', 
      'content', 
      'source_platform', 
      'marketing_tactic', 
      'creative_format', 
      'adgroup'
    ].forEach(function(item) { 
        
      var parameter = 'utm_' + item;

      if (_self.parameters.has(parameter))
        parsed[item] = _self.parameters.get(parameter);

    });

    // Forcing proper source/mediums for autotagging in case manual UTM tagging hasn't been implemented
    if (!this.parameters.has('utm_source') && !this.parameters.has('utm_medium')) {

      // @CONSIDER: we might want to allow for overriding these rules through the config
      var cpc = {
        google: ['gclid', 'gclsrc', 'dclid'],
        facebook: 'fbclid',
        bing: 'msclkid',
        linkedin: 'li_fat_id',
        tiktok: 'ttclid',
        twitter: 'twclid'
      };

      var hasClickId = false;
  
      for (var source in cpc) {
  
        if (!cpc.hasOwnProperty(source))
          continue;
  
        var clickId = cpc[source];
  
        if (Array.isArray(clickId)) {
  
          for (var i = 0; i < clickId.length; i++) {
  
            if (!this.parameters.has(clickId[i]))
              continue;
  
            hasClickId = true;
  
            break;
  
          }
  
        } else if (this.parameters.has(clickId)) {
          hasClickId = true;
        }

        if (hasClickId) {
          
          parsed.source = source;
          parsed.medium = 'cpc';

          break;

        }
  
      }

    }

    return parsed;

  },

  parseReferrer: function(uri) {

    var referrer = uri ? new URL(uri) : this.referrer;

    var parsed = {};

    // If the referrer hostname is empty or is the on same root domain as the cookieDomain then we can only assume its direct
    // @CONSIDER: use referral exclusion config parameter if cross-site
    if (!referrer || (referrer.hostname.indexOf(this.config.cookieDomain) > -1)) 
      return parsed;

    parsed = {
      source: referrer.hostname,
      medium: 'referral'
    };
  
    // @CONSIDER: we might want to allow for overriding these rules through the config
    var rules = {
      organic: {
        google: '^www\.(google)\.[a-z]{2,3}(?:\.[a-z]{2})?$',
        bing: '^www\.(bing)\.com$',
        duckduckgo: '^(duckduckgo)\.com$',
        yahoo: '^(?:www|m)?\.?(yahoo)\.(?:com|cn)$',
        ecosia: '^www\.(ecosia)\.org$',
        ask: '^www\.(ask)\.com$',
        aol: '^(?:search\.)?(aol)\.com$',
        baidu: '^www\.(baidu)\.com$',
        xfinity: '^my|search\.(xfinity)\.com',
        yandex: '^(?:www\.)?(yandex)\.com|ru$',
        lycos: '^(?:www|search)?\.?(lycos).[a-z]{2,3}(?:\.[a-z]{2})?$'
      },
      social: {
        linkedin: '^www\.(linkedin)\.com$',
        facebook: '^www\.(facebook)\.com$',
        twitter: '^t\.co$',
        instagram: '^l\.(instagram)\.com$'
      }
    };
    
    for (var medium in rules) {
      
      if (!rules.hasOwnProperty(medium))
        continue;
      
      for (var source in rules[medium]) {
      
        if (!rules[medium].hasOwnProperty(source))
          continue;
      
        var check = referrer.hostname.match(rules[medium][source]);
        
        if (!check)
          continue;
          
        parsed.source = source;
        parsed.medium = medium;
      
        break;
        
      }
      
      if (Object.keys(rules).indexOf(parsed.medium) > -1)
        break;
      
    }
    
    return parsed;

  },

  resolve: function(path) {
    
    return path.split('.').reduce(function(prev, curr) {
      return prev ? prev[curr] : null
    }, window);
      
  },

  setCookie: function(name, value, expires, units) {

    var units = typeof units !== 'undefined' ?  units : 'minutes';

    var expireDate = new Date();

    if ('days' == units)
      expireDate.setDate(expireDate.getDate() + expires);

    if ('minutes' == units) 
      expireDate.setTime(expireDate.getTime() + (expires * 60 * 1000));

    document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + ((expires == null) ? '' : '; domain=.' + this.config.cookieDomain + '; expires=' + expireDate.toUTCString()) + '; path=/';

  },

  setEventListeners: function() {

    var _self = this;

    if (this.config.enableSpaSupport) {

      this.monkeyPatchHistory();

      var handleSpaNavigation = function(e) {
        _self.setReferrer(true); // Clears referrer to prevent reading the original referrer repeatedly.
        _self.updateSession();
      };

      window.addEventListener('popstate', handleSpaNavigation);
      window.onpopstate = history.onpushstate = handleSpaNavigation;

    }

    document.addEventListener('click', function(e) {

      if (!e.target.matches('input[type="submit"], button[type="submit"]')) 
        return;

      _self.fillFormFields();

    });

  },

  setParameters: function() {

    var url = new URL(location.href);

    return url.search ? url.searchParams : false;

  },

  setReferrer: function(clear) {

    var referrer;

    if (clear) {
      referrer = false;
    } else {
      referrer = document.referrer ? new URL(document.referrer) : false;
    }

    return referrer;

  },

  updateSession: function() {

    /**
     * Parsing logic:
     * 1. Set sensible defaults to match GA defaults.
     * 2. Parse the URL parameters (UTMs and known click IDs should take precedence over any referrer parsing)
     * 2. If a source/medium couldn't be determined from parameter parsing, parse the referrer against a list 
     *    of known organic/social referrer hostnames. If the referrer doesn't match a known organic/social hostname
     *    and it isn't determined to be direct (empty referrer or referrer is on the same root domain) - the source/medium will be set as hostname/referrer
     * 3. Direct should NEVER overwrite an existing non-direct session. (aka. referrer is direct, skip referrer parsing)
     */

    var data = {
      source: '(direct)',
      medium: '(none)',
      campaign: '(not set)',
      term: '(not provided)',
      content: '(not set)',
      source_platform: '(not set)',
      marketing_tactic: '(not set)',
      creative_format: '(not set)',
      adgroup: '(not set)',
      lp: window.location.hostname + window.location.pathname,
      date: this.formatDate(),
      timestamp: Date.now()
    };

    var parameters = this.parseParameters();
    var referrer = parameters.hasOwnProperty('source') && parameters.hasOwnProperty('medium') ? {} : this.parseReferrer();

    Object.assign(data, referrer, parameters);

    if (this.session.first) {
      // If the last touch session cookie has expired - or if the current parsed session source is not direct - the last touch session 
      // cookie should be set to the latest parsed data.
      // Otherwise the existing last touch data will be persisted until the next non-direct source is encountered.
      data = (!this.session.last || (data.source !== '(direct)')) ? data : this.session.last;
    } else {
      // With ITP and other cookie limitations - this cookie will often be capped to 7 days.
      // See: https://www.cookiestatus.com for latest info.
      this.session.first = data;
      this.setCookie(this.config.cookieNames.first, data, 400, 'days');
    }
  
    this.session.last = data;

    // The last touch cookie should always be refreshed to ensure the session window is extended like in UA. 
    this.setCookie(this.config.cookieNames.last, data, this.config.sessionTimeout);

  }

};
