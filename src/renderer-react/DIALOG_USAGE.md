// Dialog Usage Examples
// =====================
// 
// O componente Dialog foi integrado ao App e pode ser usado de qualquer 
// lugar dentro da aplicação usando o hook useDialog()

import { useDialog } from './ui/components/Dialog';

// Exemplo básico - Usar em um componente:
export function MyComponent() {
  const dialog = useDialog();

  const handleDeleteInstance = () => {
    // Abrir um dialog de confirmação beautiful
    dialog.confirm(
      'Delete Instance',
      'This will remove all instance data. Continue?',
      () => {
        // Callback quando usuario clica "Confirm"
        console.log('Instance deleted!');
      },
      () => {
        // Callback opcional quando usuario clica "Cancel" 
        console.log('Deletion cancelled');
      }
    );
  };

  return (
    <button onClick={handleDeleteInstance}>Delete</button>
  );
}

// ========================
// API Completa do Dialog
// ========================

// 1. dialog.confirm(title, message, onConfirm, onCancel?)
//    Use para confirmações de ações perigosas
dialog.confirm(
  'Delete?',
  'Are you sure?',
  () => console.log('confirmed'),
  () => console.log('cancelled') // opcional
);

// 2. dialog.alert(title, message)  
//    Use para avisos simples
dialog.alert('Information', 'Operation completed successfully!');

// 3. dialog.error(title, message)
//    Use para erros
dialog.error('Error', 'Something went wrong!');

// 4. dialog.success(title, message)
//    Use para sucesso
dialog.success('Success', 'File saved!');

// 5. dialog.show(options) - Avançado
//    Para dialogs completamente customizados
dialog.show({
  title: 'Custom Dialog',
  message: 'This is a custom message',
  type: 'confirm', // 'info' | 'warning' | 'error' | 'success' | 'confirm'
  buttons: [
    {
      label: 'Cancel',
      onClick: () => console.log('cancelled'),
      variant: 'secondary' // 'primary' | 'secondary' | 'danger'
    },
    {
      label: 'Delete',
      onClick: () => console.log('deleted'),
      variant: 'danger' // para botões destrutivos
    }
  ]
});

// ========================
// Substituir confirmação nativa do Electron
// ========================

// Se você quer substituir a confirmação padrão do Electron na foto,
// use assim onde estiver chamando a ação:

import { useDialog } from './ui/components/Dialog';
import { ipcInvoke } from '../lib/ipc';

const dialog = useDialog();

dialog.confirm(
  'Remove Instances?',
  'This will remove all Factorio Forge instances and versions. Continue?',
  async () => {
    // User confirmed - execute the action
    await ipcInvoke('some-action');
  }
);
