import React, { useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppWebView } from '{{IMPORT:components.AppWebView}}';
import type { MainRouteProp, RootNavigation } from '{{IMPORT:navigation.types}}';
import { settlePayPal } from '../../services/gatewayCheckout';

/**
 * PayPal's approval page in a web view. PayPal sends the buyer to the backend's return / cancel URL;
 * the page never loads – the URL is caught here and the checkout continues (the backend captures it).
 */
export function PayPalCheckoutScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNavigation>();
  const { params } = useRoute<MainRouteProp<'PayPalCheckout'>>();
  const settled = useRef(false);

  const finish = (approved: boolean) => {
    if (settled.current) return;
    settled.current = true;
    settlePayPal(params.paymentId, approved);
    navigation.goBack();
  };

  // Leaving the screen (back button / swipe) cancels the checkout.
  useEffect(
    () => () => {
      if (!settled.current) settlePayPal(params.paymentId, false);
    },
    [params.paymentId],
  );

  return (
    <AppWebView
      url={params.approvalUrl}
      onShouldStartLoadWithRequest={request => {
        if (request.url.startsWith(params.returnUrl)) {
          finish(true);
          return false;
        }
        if (request.url.startsWith(params.cancelUrl)) {
          finish(false);
          return false;
        }
        return true;
      }}
    />
  );
}
