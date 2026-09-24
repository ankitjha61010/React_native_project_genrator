import React from 'react';
import { AppProviders } from '{{IMPORT:app.providers}}';
import { AppNavigator } from '{{IMPORT:navigation.app}}';

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

export default App;
