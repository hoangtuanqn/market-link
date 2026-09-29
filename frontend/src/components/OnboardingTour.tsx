import { driver, type DriveStep } from 'driver.js';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import useSession from '@/hooks/useSession';
import { isOnScreen, markTourSeen, shouldShowTour, TOURS, type TourRole } from '@/lib/onboarding';
import '@/styles/driver-theme.css';

const HOME: Record<TourRole, string> = { customer: '/', farmer: '/farmer' };

const START_DELAY_MS = 800;

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
        progressText: t('tour.progress', { current: '{{current}}', total: '{{total}}' }),
        nextBtnText: t('tour.next'),
        prevBtnText: t('tour.back'),
        doneBtnText: t('tour.done'),
        popoverClass: 'ml-tour',
        overlayColor: 'var(--scrim)',
        overlayOpacity: 1,
        stagePadding: 4,
        stageRadius: 6,
        disableActiveInteraction: true,
        overlayClickBehavior: () => {},
        onPopoverRender: (popover) => {
          popover.closeButton.setAttribute('aria-label', t('tour.skip'));
          popover.closeButton.title = t('tour.skip');
        },
        onDestroyed: () => {
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
