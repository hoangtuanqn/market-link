import { toast } from 'sonner';

type NotifiProps = { text?: string; title?: string };

class Notification {
  static success({ text = 'Done.', title = 'Success' }: NotifiProps) {
    return toast.success(title, { description: text });
  }

  static error({ text = 'Something went wrong.', title = 'Error' }: NotifiProps) {
    return toast.error(title, { description: text });
  }

  static info({ text = 'Working on it…', title = 'Info' }: NotifiProps) {
    return toast.info(title, { description: text });
  }

  static warning({ text = 'Please check this.', title = 'Warning' }: NotifiProps) {
    return toast.warning(title, { description: text });
  }
}
export default Notification;
