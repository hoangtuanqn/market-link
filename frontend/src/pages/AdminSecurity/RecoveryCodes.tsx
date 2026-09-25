import { Button } from '@/components/ui/button';
import Notification from '@/utils/notification';

/** FR-008 — danh sách mã khôi phục vừa sinh: chỉ hiện một lần, có nút chép / tải về. */
const RecoveryCodes = ({ codes }: { codes: string[] }) => {
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      Notification.success({ text: 'Copied. Keep them somewhere other than the phone that holds the authenticator.' });
    } catch {
      Notification.error({ text: 'Could not copy. Select the codes and copy them by hand.' });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`MarketLink admin recovery codes\n\n${text}\n`], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marketlink-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
    Notification.success({ text: 'Downloaded as marketlink-recovery-codes.txt.' });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="bg-surface-sunken border-line-strong m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2 rounded-sm border-[1.5px] p-4 font-mono text-[15px] md:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>
          Copy the codes
        </Button>
        <Button variant="secondary" size="sm" onClick={download}>
          Download
        </Button>
      </div>
    </div>
  );
};

export default RecoveryCodes;
