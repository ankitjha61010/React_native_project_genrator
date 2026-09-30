import React from 'react';
import { AppProviders } from '@presentation/app/AppProviders';
import { AppNavigator } from '@presentation/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

export default App;
