# Attributor

### Purpose

Emulates old 1st party cookies set for `utm_`(`source`, `medium`, `campaign`, `term`, `content`, `id`) + the 3 new `source_platform`, `marketing_tactic`, `creative_format` parameters in Classic Google Analytics (ga.js). Easily fill hidden form fields with the stored values of your first and last touch data (great for closed-loop/ROAS reporting needs). This script is meant to be a standardized means of implementing UTM cookies for campaign attribution.


### What data is stored?
1st party cookies `attr_first` and `attr_last` are stored at root domain `.domain.com`.

`attr_last` - Has an expiration date of 30-minutes. The 30-minutes is reset on each subsequent page load. This is meant to emulate the same session windows as Google Analytics.

`attr_first` - Has an expiration date of 2-years. This cookie will never be set more than once (unless the cookie is of course deleted).

Each of these cookies contains an encoded JSON object of key:value pairs for the following data:

- source
- medium
- campaign
- term
- content
- id
- source_platform
- marketing_tactic
- creative_format

The data points above are pulled from standard UTM parameters or are assigned implicit values via referral parsing.

### How to Use

#### Install Attributor.js
The easiest way to use Attributor is by loading the script via jsdelivr. This can be done via a Custom HTML tag inside of Google Tag Manager.

```html
<script src="https://cdn.jsdelivr.net/gh/derekcavaliero/attributor@latest/dist/attributor.min.js"></script>
<script>
(function(){
    window.__utmz = new Attributor();
})();
</script>
```

#### Creating an Attributor instance
The `Attributor` constructor accepts a single configuration object - the library uses (some) sensible defaults, so you only need to override what configuration options you need to change.

    var __utmz = new Attributor({
      cookieDomain: 'domain.com'
    });

#### Default Field Mapping
Attributor uses sensible defaults for mapping stored campaign data to html form inputs. Fields are mapped per cookie using HTML `<input>` `name` attributes. The script can easily be modified to use classes for field mapping. The default field mapping is defined as a simple object literal:

```javascript
{
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
}
```

This means that if you were to use the following hidden field markup - you need not configure any custom field mapping object:

```html
<!-- last -->
<input type="hidden" name="utm_source">
<input type="hidden" name="utm_medium">
<input type="hidden" name="utm_campaign">
<input type="hidden" name="utm_term">
<input type="hidden" name="utm_content">
<input type="hidden" name="utm_source_platform">
<input type="hidden" name="utm_marketing_tactic">
<input type="hidden" name="utm_creative_format">
<input type="hidden" name="utm_adgroup">
<input type="hidden" name="utm_id">

<!-- first -->
<input type="hidden" name="utm_source_1st">
<input type="hidden" name="utm_medium_1st">
<input type="hidden" name="utm_campaign_1st">
<input type="hidden" name="utm_term_1st">
<input type="hidden" name="utm_content_1st">
<input type="hidden" name="utm_source_platform_1st">
<input type="hidden" name="utm_marketing_tactic_1st">
<input type="hidden" name="utm_creative_format_1st">
<input type="hidden" name="utm_adgroup_1st">
<input type="hidden" name="utm_id_1st">
```

#### Defining a custom field map
If you cannot (or wish not to) use the default field mapping. You can easily create your own by defining you own `fieldMap` in the configuration object passed to the `Attributor` constructor. Custom field mappings are merged into the default `fieldMap` object.

```javascript
var __utmz = new Attributor({
    cookieDomain: 'domain.com',
    fieldMap: {
        first: {
            source: 'source_1st',
            medium: 'medium_1st',
            campaign: 'campaign_1st',
            term: 'term_1st',
            content: 'content_1st',
        },
        last: {
            source: 'source_last',
            medium: 'medium_last',
            campaign: 'campaign_last',
            term: 'term_last',
            content: 'content_last',
        }
    }
});
```

If you only need/wish to change a few of the default field mappings - you can set those explicitly without affecting the other defaults:

```javascript
var __utmz = new Attributor({
    cookieDomain: 'mydomain.com',
    fieldMap: {
        cookies: {
            _ga: 'ga_client_id'
        }
    }
});
```

#### Cookies and Globals
Grabbing values from cookies set by other ad/martech is a pretty common need (especially for paid media). Attributor's `cookies` property in the config `fieldMap` can be customized to grab any 1st party cookie value and have it mapped to a form input similar to the first/last touch campaign data mentioned above. 

For example, you could grab the `_gcl_aw` (Google Ads Click ID), and `_ga` (Google Analytics Client ID) cookie values + the current user agent via `navigator.userAgent` as so:

```json
{
    first: {},
    last: {},
    cookies: {
        _ga: 'ga_client_id',
        _gcl_aw: 'gclid'
    },
    globals: {
        'navigator.userAgent': 'user_agent' 
    }
}
```

The above example would map the data to the 3 form fields with the approprate names:

```html
<input type="hidden" name="ga_client_id">
<input type="hidden" name="gclid">
<input type="hidden" name="user_agent">
```

#### Filters

The library has some predefined filters to handle filtering the cookie and global values. Note - these filters _only_ work on the `cookies` and `globals`. You can define filters using the `filters` property in the config object. For example, the following filter will remove the first two delimited values from the `_ga` cookie. The filter property name _must_ match the name of the cookie or global window path reference.

```javascript
filters: {
    _ga: function(val) {
        // e.g: GA1.2.1234567890.0987654321
        // Should return 1234567890.0987654321
        return val.split('.').slice(2).join('.');
    }
}
```

#### `Attributor.getAll()`

For convenience, each Attributor instance will have access to a `getAll()` method that will return an object literal of all the data in the fieldMap object. This can be useful if you would like to store the data as a JSON string in a single record rather than explicit form fields.

#### Prefilling
The script will automatically run it's `Attributor.fillFormFields()` method when initialized.

You can also manually call the method as such:

```javascript
var __utmz = new Attributor(config);
__utmz.fillFormFields();
```

This can be helpful for a few scenarios

- Forms loaded via JS or 3rd party systems
- When a form is loaded into the DOM after initial pageload (e.g: a modal/popup)

##### HubSpot

```javascript
window.addEventListener('message', function(event) {
    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormReady') {
        __utmz.fillFormFields();
    }
});
```

##### Marketo

```javascript
if (typeof MktoForms2 !== 'undefined') {
    MktoForms2.whenReady( function( form ) {
        __utmz.fillFormFields();
    });
}
```

#### Changing the Prefill Target Method
By default, Attributor will use `<input>` `name` attributes for updating/prefilling. This can be customized when initializing attributor using the `fieldTargetMethod` property.

- `name` (default) - uses `document.getElementsByName('{field_map_key}')`
- `class` - uses `document.querySelectorAll('input.{field_map_key}')`
- `parentClass` - uses `document.querySelectorAll('.{field_map_key} input')`

For example:

```javascript
var __utmz = new Attributor({
    cookieDomain: 'mydomain.com', 
    fieldTargetMethod: 'class',
    fieldMap: {
        last: {
            source: 'custom_source_last'
        }
    }
});
```

```html
<input type="hidden" name="input_9a8dfs" class="custom_source_last">
```
