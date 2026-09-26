import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from './index';
import i18n from '@/i18n';

vi.mock('@/hooks/useLogout', () => ({ default: () => vi.fn() }));
vi.mock('@/hooks/useChatUnread', () => ({ default: () => 3 }));
vi.mock('@/components/chat/MessagesPreview', () => ({ default: () => null }));
vi.mock('@/components/notifications/NotificationsPreview', () => ({ default: () => null }));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header variant="customer" userName="An" unreadCount={3} />
    </MemoryRouter>,
  );

describe('Header', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  /** FR-113: the unread count sits right on the icon, and a screen reader can hear it. */
  it('shows how many messages are unread', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Messages, 3 unread' })).toBeInTheDocument();
  });

  /** A language's singular ≠ plural: let i18next choose the form by `count`, do not hardcode the `_one` key. */
  it('lets the language pick the plural form of the unread labels', async () => {
    i18n.addResources('fr', 'common', {
      'header.messagesUnread_one': 'Messages, {{count}} non lu',
      'header.messagesUnread_other': 'Messages, {{count}} non lus',
      'header.notificationsUnread_one': 'Notifications, {{count}} non lue',
      'header.notificationsUnread_other': 'Notifications, {{count}} non lues',
    });
    await i18n.changeLanguage('fr');
    renderHeader();

    expect(screen.getByRole('button', { name: 'Messages, 3 non lus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications, 3 non lues' })).toBeInTheDocument();
  });
});
