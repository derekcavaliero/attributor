Attributor = function(config) {

  var _defaults = {
    cookieDomain: location.hostname,
    cookieNames: {
      first: 'attr_first',
      last: 'attr_last'
    },
    decorateHostnames: [],
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
        id: 'utm_id_1st'
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
        id: 'utm_id'
      },
      cookies: null,
      globals: null
    },
    fieldTargetMethod: 'name',
    filters: {
      'location.href': function(val) {
        // e.g: https://www.example.com/path?query=string
        // Should return https://www.example.com/path
        return val.split('?')[0];
      },
      'document.referrer': function(val) {
        // e.g: https://www.example.com/path?query=string
        // Should return https://www.example.com/path
        return val.split('?')[0];
      }
    },
    nullValue: '(not set)',
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

  grab: function(sessionMode) {

      // Valid values: 'all', 'first', 'last'
      var sessionMode = typeof sessionMode !== 'undefined' ? sessionMode : 'all';

      var data = {
        cookies: this.getCookieValues(),
        globals: this.getGlobalValues()
      };
      
      for (var key in this.config.fieldMap) {

        if (!this.config.fieldMap.hasOwnProperty(key) || !data.hasOwnProperty(key)) 
          continue;
  
        for (var prop in this.config.fieldMap[key]) {
  
          if (!this.config.fieldMap[key].hasOwnProperty(prop)) 
            continue;

          if (data[key][prop] && data[key][prop] != this.config.nullValue)
            data[key][this.config.fieldMap[key][prop]] = data[key][prop];

          delete data[key][prop];

        }

      }

      var sessionData = {};

      if (sessionMode == 'all') {
        sessionData = this.session;
      } else if (['first', 'last'].indexOf(sessionMode) > -1) {
        sessionData = this.session[sessionMode];
      }

      return Object.assign(
        {
          session: sessionData
        },
        data.cookies, 
        data.globals
      );

  },

  fillFormFields: function(settings)  {

    var settings = typeof settings === 'object' ? settings : {};

    var query = {
      targetMethod: settings.targetMethod || this.config.fieldTargetMethod,
      scope: settings.scope || document
    };

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

        switch (query.targetMethod) {

          case 'class':
            fields = query.scope.querySelectorAll('input.' + field);
          break;

          case 'parentClass':
            fields = query.scope.querySelectorAll('.' + field + ' input');
          break;

          case 'name':
          default:
            fields = query.scope.querySelectorAll('input[name="' + field + '"]');
          break;

        }

        if (!fields)
          continue;
        
        for (var i = 0; i < fields.length; i++) {
          if (data[key].hasOwnProperty(prop) && data[key][prop] != '') {
            fields[i].value = data[key][prop];
            fields[i].dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      

      }

    }

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
      
      // @CONSIDER: wrap in try/catch to avoid poor filter design that throw execeptions.
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
        globals[prop] = typeof this.config.filters[prop] === 'function' ? this.config.filters[prop](this.resolve(prop)) : this.resolve(prop);
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
      'adgroup',
      'id'
    ].forEach(function(item) { 
        
      var parameter = 'utm_' + item;

      if (_self.parameters.has(parameter))
        parsed[item] = _self.parameters.get(parameter);

    });

    // Forcing proper source/mediums for autotagging in case manual UTM tagging hasn't been implemented
    if (!this.parameters.has('utm_source') && !this.parameters.has('utm_medium')) {

      // @CONSIDER: we might want to allow for overriding these rules through the config
      var cpc = {
        google: ['gclid', 'gclsrc', 'dclid', 'wbraid', 'gad_source'],
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

    function fillBeforeSubmit(e) {
      if (!e.target.matches('[type="submit"]')) 
        return;

      _self.fillFormFields({
        scope: e.target.form || e.target.closest('form')
      });
    }

    document.addEventListener('click', fillBeforeSubmit);

    function decorateLinks(e) {
      
      if (!e.target.matches('a')) 
        return;

      if (!e.target.href)
        return;

      var url = new URL(e.target.href);

      if (_self.config.decorateHostnames.indexOf(url.hostname) === -1)
        return;

      ['source', 'medium', 'campaign', 'term', 'content', 'id'].forEach(function(param) {
        url.searchParams.set('utm_' + param, _self.session.last[param]);
      });

      e.target.href = url.toString();

    }

    document.addEventListener('click', decorateLinks);

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
      campaign: this.config.nullValue,
      term: this.config.nullValue,
      content: this.config.nullValue,
      source_platform: this.config.nullValue,
      marketing_tactic: this.config.nullValue,
      creative_format: this.config.nullValue,
      adgroup: this.config.nullValue,
      id: this.config.nullValue
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
