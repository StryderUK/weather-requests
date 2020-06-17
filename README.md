This is a quick modified version of the original weather module to include new metoffice datahub api and to use node_helper to work around CORS issues

# Weather Module

Original description from : [https://github.com/MichMich/MagicMirror/tree/master/modules/default/weather](https://github.com/MichMich/MagicMirror/tree/master/modules/default/weather)

This module is aimed to be the replacement for the current `currentweather` and `weatherforcast` modules. The module will be configurable to be used as a current weather view, or to show the forecast. This way the module can be used twice to fullfil both purposes.

For configuration options, please check the [MagicMirror² documentation](https://docs.magicmirror.builders/modules/weather.html).

## Screenshot

![Alt text](/../screenshots/screenshots/example.png?raw=true "Example Screenshot")

## Install

Clone files into magic mirror's module filer (<Install_Dir>/modules). e.g.

```
# Change to install dir
cd ~/MagicMirror/modules
# Clone repository
git clone https://github.com/StryderUK/weather-requests
# Configure config
nano ~/MagicMirror/config/config.js
```

Look through the code to find the more detail in the config

### Example Config
```javascript
               {
                        module: "weather-requests",
                        header: "",
                        position: "top_right",
                        config: {
                                // See 'Configuration options' for more information.
                                type: 'current',
                                weatherProvider: 'ukmetoffice-datahub',
                                apiBase: 'https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0/forecasts/point/',
                                // Get from met office datahub api site after registering and subscribing (free 360 requests per day)
                                clientId: "YOUR_CLIENT_ID",
                                clientSecret: "YOUR_CLIENT_SECRET",
                                // Your coordinates (get from google maps)
                                longitude: "0.0",
                                latitude: "0.0",

                                showWindDirectionAsArrow: true,
                                showPrecipitationAmount: true
                        }
                },
                {
                        module: "weather-requests",
                        position: "top_right",
                        config: {
                                // See 'Configuration options' for more information.
                                type: 'forecast',
                                weatherProvider: 'ukmetoffice-datahub',
                                apiBase: 'https://api-metoffice.apiconnect.ibmcloud.com/metoffice/production/v0/forecasts/point/',
                                // Get from met office datahub api site after registering and subscribing (free 360 requests per day)
                                clientId: "YOUR_CLIENT_ID",
                                clientSecret: "YOUR_CLIENT_SECRET",
                                // Your coordinates (get from google maps)
                                longitude: "0.0",
                                latitude: "0.0",

                                //appendLocationNameToHeader: false,
                                maxNumberOfDays: 8
                        }
                },
```
