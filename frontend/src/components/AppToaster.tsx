import { Toaster } from 'sonner';

/** A toast shared by every layout (Customer/Farmer and the admin area) — design system `Toast`. */
const AppToaster = () => (
  <Toaster
    position="top-center"
    visibleToasts={5}
    closeButton
    toastOptions={{
      duration: 4000,
      classNames: {
        toast: '!rounded-md !border-line-strong !bg-surface-raised !text-ink !shadow-float !font-sans',
        description: '!text-ink-muted',
        success: '[&_[data-icon]]:!text-success',
        error: '!border-danger [&_[data-icon]]:!text-danger',
        warning: '[&_[data-icon]]:!text-warning-ink',
      },
    }}
  />
);

export default AppToaster;
