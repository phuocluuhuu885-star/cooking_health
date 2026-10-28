import { combineReducers } from 'redux';
import { UserSlice } from './user';
import appData from './appData';

export default combineReducers({
  user: UserSlice.reducer,
  appData,
});
