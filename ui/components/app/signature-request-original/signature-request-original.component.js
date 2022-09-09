import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { ObjectInspector } from 'react-inspector';
import LedgerInstructionField from '../ledger-instruction-field';

import { MESSAGE_TYPE } from '../../../../shared/constants/app';
import { EVENT } from '../../../../shared/constants/metametrics';
import { getURLHostName } from '../../../helpers/utils/util';
import { conversionUtil } from '../../../../shared/modules/conversion.utils';
import { stripHexPrefix } from '../../../../shared/modules/hexstring-utils';
import Button from '../../ui/button';
import SiteOrigin from '../../ui/site-origin';
import NetworkAccountBalanceHeader from '../network-account-balance-header';
import Typography from '../../ui/typography/typography';
import {
  TYPOGRAPHY,
  FONT_WEIGHT,
} from '../../../helpers/constants/design-system';

export default class SignatureRequestOriginal extends Component {
  static contextTypes = {
    t: PropTypes.func.isRequired,
    trackEvent: PropTypes.func.isRequired,
  };

  static propTypes = {
    fromAccount: PropTypes.shape({
      address: PropTypes.string.isRequired,
      balance: PropTypes.string,
      name: PropTypes.string,
    }).isRequired,
    cancel: PropTypes.func.isRequired,
    clearConfirmTransaction: PropTypes.func.isRequired,
    conversionRate: PropTypes.number,
    history: PropTypes.object.isRequired,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    sign: PropTypes.func.isRequired,
    txData: PropTypes.object.isRequired,
    subjectMetadata: PropTypes.object,
    hardwareWalletRequiresConnection: PropTypes.bool,
    isLedgerWallet: PropTypes.bool,
    nativeCurrency: PropTypes.string.isRequired,
    messagesCount: PropTypes.number,
    showRejectTransactionsConfirmationModal: PropTypes.func.isRequired,
    cancelAll: PropTypes.func.isRequired,
    currentNetwork: PropTypes.string,
  };

  state = {
    fromAccount: this.props.fromAccount,
  };

  renderHeader = () => {
    const { conversionRate, nativeCurrency, currentNetwork } = this.props;
    const {
      fromAccount: { address, balance, name },
    } = this.state;

    const balanceInBaseAsset = conversionUtil(balance, {
      fromNumericBase: 'hex',
      toNumericBase: 'dec',
      fromDenomination: 'WEI',
      numberOfDecimals: 6,
      conversionRate,
    });

    return (
      <div className="request-signature__account">
        <NetworkAccountBalanceHeader
          networkName={currentNetwork}
          accountName={name}
          accountBalance={balanceInBaseAsset}
          tokenName={nativeCurrency}
          accountAddress={address}
        />
      </div>
    );
  };

  msgHexToText = (hex) => {
    try {
      const stripped = stripHexPrefix(hex);
      const buff = Buffer.from(stripped, 'hex');
      return buff.length === 32 ? hex : buff.toString('utf8');
    } catch (e) {
      return hex;
    }
  };

  renderTypedData = (data) => {
    const { t } = this.context;
    const { domain, message } = JSON.parse(data);
    return (
      <div className="request-signature__typed-container">
        {domain ? (
          <div>
            <h1>{t('domain')}</h1>
            <ObjectInspector data={domain} expandLevel={1} name="domain" />
          </div>
        ) : (
          ''
        )}
        {message ? (
          <div>
            <h1>{t('message')}</h1>
            <ObjectInspector data={message} expandLevel={1} name="message" />
          </div>
        ) : (
          ''
        )}
      </div>
    );
  };

  renderBody = () => {
    let rows;
    let notice = `${this.context.t('youSign')}:`;

    const { txData, subjectMetadata } = this.props;
    const {
      type,
      msgParams: { data },
    } = txData;

    if (type === MESSAGE_TYPE.PERSONAL_SIGN) {
      rows = [
        { name: this.context.t('message'), value: this.msgHexToText(data) },
      ];
    } else if (type === MESSAGE_TYPE.ETH_SIGN_TYPED_DATA) {
      rows = data;
    } else if (type === MESSAGE_TYPE.ETH_SIGN) {
      rows = [{ name: this.context.t('message'), value: data }];
      notice = this.context.t('signNotice');
    }

    const targetSubjectMetadata = txData.msgParams.origin
      ? subjectMetadata?.[txData.msgParams.origin]
      : null;

    return (
      <div className="request-signature__body">
        <div className="request-signature__origin">
          <SiteOrigin
            siteOrigin={txData.msgParams.origin}
            iconSrc={targetSubjectMetadata?.iconUrl}
            iconName={
              getURLHostName(targetSubjectMetadata?.origin) ||
              targetSubjectMetadata?.origin
            }
            chip
          />
        </div>

        <Typography
          className="request-signature__content__title"
          variant={TYPOGRAPHY.H3}
          fontWeight={FONT_WEIGHT.BOLD}
        >
          {this.context.t('sigRequest')}
        </Typography>

        <div
          className={classnames('request-signature__notice', {
            'request-signature__warning': type === MESSAGE_TYPE.ETH_SIGN,
          })}
        >
          {notice}
          {type === MESSAGE_TYPE.ETH_SIGN ? (
            <span
              className="request-signature__help-link"
              onClick={() => {
                global.platform.openTab({
                  url: 'https://consensys.net/blog/metamask/the-seal-of-approval-know-what-youre-consenting-to-with-permissions-and-approvals-in-metamask/',
                });
              }}
            >
              {this.context.t('learnMoreUpperCase')}
            </span>
          ) : null}
        </div>
        <div className="request-signature__rows">
          {rows.map(({ name, value }, index) => {
            if (typeof value === 'boolean') {
              // eslint-disable-next-line no-param-reassign
              value = value.toString();
            }
            return (
              <div
                className="request-signature__row"
                key={`request-signature-row-${index}`}
              >
                <div className="request-signature__row-title">{`${name}:`}</div>
                <div className="request-signature__row-value">{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  renderFooter = () => {
    const {
      cancel,
      clearConfirmTransaction,
      history,
      mostRecentOverviewPage,
      sign,
      txData: { type },
      hardwareWalletRequiresConnection,
    } = this.props;
    const { trackEvent, t } = this.context;

    return (
      <div className="request-signature__footer">
        <Button
          type="secondary"
          large
          className="request-signature__footer__cancel-button"
          onClick={async (event) => {
            await cancel(event);
            trackEvent({
              category: EVENT.CATEGORIES.TRANSACTIONS,
              event: 'Cancel',
              properties: {
                action: 'Sign Request',
                legacy_event: true,
                type,
              },
            });
            clearConfirmTransaction();
            history.push(mostRecentOverviewPage);
          }}
        >
          {t('cancel')}
        </Button>
        <Button
          data-testid="request-signature__sign"
          type="primary"
          large
          className="request-signature__footer__sign-button"
          disabled={hardwareWalletRequiresConnection}
          onClick={async (event) => {
            await sign(event);
            trackEvent({
              category: EVENT.CATEGORIES.TRANSACTIONS,
              event: 'Confirm',
              properties: {
                action: 'Sign Request',
                legacy_event: true,
                type,
              },
            });
            clearConfirmTransaction();
            history.push(mostRecentOverviewPage);
          }}
        >
          {t('sign')}
        </Button>
      </div>
    );
  };

  handleCancelAll = () => {
    const {
      cancelAll,
      clearConfirmTransaction,
      history,
      mostRecentOverviewPage,
      showRejectTransactionsConfirmationModal,
      messagesCount,
    } = this.props;
    const unapprovedTxCount = messagesCount;

    showRejectTransactionsConfirmationModal({
      unapprovedTxCount,
      onSubmit: async () => {
        await cancelAll();
        clearConfirmTransaction();
        history.push(mostRecentOverviewPage);
      },
    });
  };

  render = () => {
    const { messagesCount } = this.props;
    const { t } = this.context;
    const rejectNText = t('rejectTxsN', [messagesCount]);
    return (
      <div className="request-signature__container">
        {this.renderHeader()}
        {this.renderBody()}
        {this.props.isLedgerWallet ? (
          <div className="confirm-approve-content__ledger-instruction-wrapper">
            <LedgerInstructionField showDataInstruction />
          </div>
        ) : null}
        {this.renderFooter()}
        {messagesCount > 1 ? (
          <Button
            type="link"
            className="request-signature__container__reject"
            onClick={() => this.handleCancelAll()}
          >
            {rejectNText}
          </Button>
        ) : null}
      </div>
    );
  };
}
