# Attributor

### Purpose

Emulates old 1st party cookies set for source/medium/campaign/term/content in Classic Google Analytics (ga.js). Easily fill hidden form fields with the stored values of your first and last touch data (great for closed-loop/ROAS reporting needs). This script is meant to be a standardized means of implementing UTM cookies for campaign attribution.


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
- adgroup
- gclid
- fbclid
- date
- lp

Most the the data points above are pulled from standard UTM parameters or are given values via referral parsing and/or general metadata (date/lp).

### How to Use

#### Install Attributor.js
This can be done via a custom HTML tag inside of Google Tag Manager - or you can include the script in your own webpack/gulp dependencies.


#### Creating an Attributor instance

    var __utmz = new Attributor('mydomain.com');

#### Default Field Mapping
Attributor uses sensible defaults for field mapping. Fields are mapped per cookie using HTML `<input>` `name` attributes. The script can easily be modified to use classes for field mapping. The default field mapping is defined as a simple object literal:

    {
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
            'navigator.user_agent': 'user_agent',
            'location.href': 'conversion_url'
        }
    }

This means that if you were to use the following hidden field markup - you need not configure any custom field mapping object:

    <!-- last -->
    <input type="hidden" name="utm_source">
    <input type="hidden" name="utm_medium">
    <input type="hidden" name="utm_campaign">
    <input type="hidden" name="utm_term">
    <input type="hidden" name="utm_content">
    <input type="hidden" name="utm_adgroup">
    <input type="hidden" name="gclid">
    <input type="hidden" name="fbclid">
    <input type="hidden" name="lp_last">
    <input type="hidden" name="date_last">

    <!-- first -->
    <input type="hidden" name="utm_source_1st">
    <input type="hidden" name="utm_medium_1st">
    <input type="hidden" name="utm_campaign_1st">
    <input type="hidden" name="utm_term_1st">
    <input type="hidden" name="utm_content_1st">
    <input type="hidden" name="utm_adgroup_1st">
    <input type="hidden" name="gclid_1st">
    <input type="hidden" name="fbclid_1st">
    <input type="hidden" name="lp_1st">
    <input type="hidden" name="date_1st">

    <!-- cookies -->
    <input type="hidden" name="ga">
    <input type="hidden" name="fbp">
    <input type="hidden" name="fbc">

    <!-- globals -->
    <input type="hidden" name="user_agent">
    <input type="hidden" name="conversion_url">

#### Defining a custom field map
If you cannot (or wish not to) use the default field mapping. You can easily create your own by passing in a second argument to the `Attributor` constructor to override the default field mapping:

    var __utmz = new Attributor('mydomain.com', {
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
    });

If you only need/wish to change a couple of the default field mappings - you can set those explicitly without affecting the other defaults:

    var __utmz = new Attributor('mydomain.com', {
        cookies: {
            _ga: 'ga_client_id'
        }
    });
    
#### Prefilling
The script will automatically run it's `Attributor.fillFormFields()` method when initialized.

You can also manually call the method as such:

    var __utmz = new Attributor('mydomain.com');
    __utmz.fillFormFields();

This can be helpful for a few scenarios

- Forms loaded via JS or 3rd party systems
- When a form is loaded into the DOM after initial pageload (e.g: a modal/popup)

##### HubSpot

    window.addEventListener('message', function(event) {
        if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormReady') {
            __utmz.fillFormFields();
        }
    });

##### Marketo

    if (typeof MktoForms2 !== 'undefined') {
        MktoForms2.whenReady( function( form ) {
            __utmz.fillFormFields();
        });
    }

#### Changing the Prefill Target Method
By default, Attributor will use `<input>` `name` attributes for updating/prefilling. This can be customized when initializing attributor using the 3rd parameter `fieldTargetMethod`.

- `name` (default) - uses `document.getElementsByName('{field_map_key}')`
- `class` - uses `document.querySelectorAll('input.{field_map_key}')`
- `parentClass` - uses `document.querySelectorAll('.{field_map_key} input')`

For example:

    // JavaScript
    var __utmz = new Attributor('mydomain.com', {
        last: {
            source: 'custom_source_last'
        }
    }, 'class');

    <!-- HTML -->
    <input type="hidden" name="input_9a8dfs" class="custom_source_last">
