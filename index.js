/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { configureBackgroundPushNotifications } from './src/utils/pushNotifications';
import App from './src/index';
import { name as appName } from './app.json';

configureBackgroundPushNotifications();

AppRegistry.registerComponent(appName, () => App);
