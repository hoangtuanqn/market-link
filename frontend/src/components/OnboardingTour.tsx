import { driver, type DriveStep } from 'driver.js';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import useSession from '@/hooks/useSession';
import { isOnScreen, markTourSeen, shouldShowTour, TOURS, type TourRole } from '@/lib/onboarding';
import '@/styles/driver-theme.css';

/**
 * The tour only opens on the role's home page, never on a flow page (set password, complete profile, checkout…). Not
 * seen yet = it waits for the next visit to home.
 */
const HOME: Record<TourRole, string> = { customer: '/', farmer: '/farmer', admin: '/admin' };

/** Give the layout (sidebar, header icons, fonts) a moment to settle before measuring targets. */
const START_DELAY_MS = 800;

/**
 * Step-by-step guided tour of the layout the signed-in person lands in, shown once per account and role (see
 * lib/onboarding.ts). Mounted by each layout with its own role; renders nothing itself.
 */
const OnboardingTour = ({ role }: { role: TourRole }) => {
  const { t } = useTranslation('common');
  const { user } = useSession();
  const { pathname } = useLocation();
  const userId = user?.role === role ? user.id : undefined;
  const onHome = pathname === HOME[role];

  useEffect(() => {
    if (userId === undefined || !onHome) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tour: ReturnType<typeof driver> | undefined;

    const start = () => {
      // Only steps whose target is on screen for this viewport: desktop gets the header links / sidebar, a phone gets
      // the menu button instead.
      const steps: DriveStep[] = TOURS[role].flatMap((step) => {
        const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
        if (step.target && !isOnScreen(el)) return [];
        return [
          {
            element: el ?? undefined,
            popover: {
              title: t(`tour.steps.${step.key}.title`),
              description: t(`tour.steps.${step.key}.body`),
              side: step.side,
              align: 'start',
            },
          },
        ];
      });
      if (steps.length === 0) return;

      tour = driver({
        steps,
        showProgress: true,
        // driver.js fills {{current}} / {{total}} itself, so hand the placeholders through i18next untouched
        progressText: t('tour.progress', { current: '{{current}}', total: '{{total}}' }),
        nextBtnText: t('tour.next'),
        prevBtnText: t('tour.back'),
        doneBtnText: t('tour.done'),
        popoverClass: 'ml-tour',
        overlayColor: 'var(--scrim)',
        overlayOpacity: 1,
        stagePadding: 4,
        stageRadius: 6,
        // The highlighted link is only shown, not followed: a click would leave the page mid-tour
        disableActiveInteraction: true,
        // A stray click on the dimmed page should not end the tour for good; Esc and the close button still do
        overlayClickBehavior: () => {},
        onPopoverRender: (popover) => {
          popover.closeButton.setAttribute('aria-label', t('tour.skip'));
          popover.closeButton.title = t('tour.skip');
        },
        onDestroyed: () => {
          // Finished, skipped or closed with Esc: all count as seen. Unmounting (sign-out, remount) does not.
          if (!cancelled) void markTourSeen(userId, role);
        },
      });
      tour.drive();
    };

    shouldShowTour(userId, role).then((show) => {
      if (show && !cancelled) timer = setTimeout(start, START_DELAY_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      tour?.destroy();
    };
  }, [userId, onHome, role, t]);

  return null;
};

export default OnboardingTour;
