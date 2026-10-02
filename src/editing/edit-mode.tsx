import { createContext, useContext, type ReactNode } from 'react';

// Whether fields are editable at all. Off by default - the page looks and behaves exactly like
// the plain static CV until the toolbar's Edit button turns this on.
const EditModeContext = createContext(false);

export function EditModeProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode(): boolean {
  return useContext(EditModeContext);
}
