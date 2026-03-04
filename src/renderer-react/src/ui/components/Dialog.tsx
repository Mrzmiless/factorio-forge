import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type DialogType = 'info' | 'warning' | 'error' | 'success' | 'confirm';
type DialogButton = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

type Dialog = {
  id: string;
  title: string;
  message: string;
  type: DialogType;
  buttons: DialogButton[];
  onClose?: () => void;
};

type DialogCtx = {
  show: (options: Omit<Dialog, 'id'>) => Promise<void>;
  confirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  alert: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  success: (title: string, message: string) => void;
};

const DialogContext = createContext<DialogCtx | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);

  const show = useCallback(
    async (options: Omit<Dialog, 'id'>) => {
      return new Promise<void>((resolve) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const dialog: Dialog = {
          ...options,
          id,
          onClose: () => {
            setDialogs((prev) => prev.filter((d) => d.id !== id));
            options.onClose?.();
            resolve();
          }
        };
        setDialogs((prev) => [...prev, dialog]);
      });
    },
    []
  );

  const confirm = useCallback(
    (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      show({
        title,
        message,
        type: 'confirm',
        buttons: [
          { label: 'Cancel', onClick: onCancel || (() => {}), variant: 'secondary' },
          { label: 'Confirm', onClick: onConfirm, variant: 'primary' }
        ]
      }).catch(() => {});
    },
    [show]
  );

  const alert = useCallback(
    (title: string, message: string) => {
      show({
        title,
        message,
        type: 'info',
        buttons: [{ label: 'OK', onClick: () => {}, variant: 'primary' }]
      }).catch(() => {});
    },
    [show]
  );

  const error = useCallback(
    (title: string, message: string) => {
      show({
        title,
        message,
        type: 'error',
        buttons: [{ label: 'OK', onClick: () => {}, variant: 'primary' }]
      }).catch(() => {});
    },
    [show]
  );

  const success = useCallback(
    (title: string, message: string) => {
      show({
        title,
        message,
        type: 'success',
        buttons: [{ label: 'OK', onClick: () => {}, variant: 'primary' }]
      }).catch(() => {});
    },
    [show]
  );

  const ctx = useMemo(
    () => ({ show, confirm, alert, error, success }),
    [show, confirm, alert, error, success]
  );

  return (
    <DialogContext.Provider value={ctx}>
      {children}
      <div className="dialogHost">
        {dialogs.map((dialog) => (
          <DialogComponent key={dialog.id} dialog={dialog} />
        ))}
      </div>
    </DialogContext.Provider>
  );
}

interface DialogComponentProps {
  dialog: Dialog;
}

function DialogComponent({ dialog }: DialogComponentProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      dialog.onClose?.();
    }, 200);
  };

  const handleButtonClick = (btn: DialogButton) => {
    btn.onClick();
    handleClose();
  };

  const getIcon = () => {
    switch (dialog.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'confirm':
        return '?';
      default:
        return 'ⓘ';
    }
  };

  return (
    <div className={`dialogOverlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`dialog dialog-${dialog.type} ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialogIcon">
          <span className={`dialogIconContent icon-${dialog.type}`}>{getIcon()}</span>
        </div>

        <div className="dialogContent">
          <h2 className="dialogTitle">{dialog.title}</h2>
          <p className="dialogMessage">{dialog.message}</p>
        </div>

        <div className="dialogButtons">
          {dialog.buttons.map((btn, idx) => (
            <button
              key={idx}
              className={`dialogBtn btn-${btn.variant || 'secondary'}`}
              onClick={() => handleButtonClick(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}
