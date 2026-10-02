import { createContext, useContext, type ReactNode } from 'react';

export const UI_LANGS = ['pl', 'en'] as const;
export type UiLang = (typeof UI_LANGS)[number];

/** Names of the blocks that can be added/moved/removed, used in "+ Add …" buttons and control labels. */
export type ItemKind = 'paragraph' | 'skillGroup' | 'job' | 'project' | 'bullet' | 'education';

const UI = {
  pl: {
    add: 'Dodaj',
    switchInterfaceTo: 'Przełącz interfejs na angielski',
    preview: 'Podgląd',
    edit: 'Edycja',
    mode: 'Tryb',
    cvLanguage: 'Język CV',
    undo: 'Cofnij',
    undoTitle: 'Cofnij ostatnią zmianę (Ctrl+Z)',
    save: 'Zapisz',
    saveTitle: (name: string) => `Zapisz zmiany w „${name}”`,
    nothingToSave: 'Brak zmian do zapisania',
    unsaved: 'niezapisane zmiany',
    pdfTitle: 'Pobierz PDF (ostatnia zapisana wersja)',
    pdfUnsaved: 'Masz niezapisane zmiany - PDF powstanie z ostatniej zapisanej wersji. Pobrać mimo to?',
    pickVariant: 'Wybierz wariant CV',
    variants: 'Warianty CV',
    duplicateAs: 'Duplikuj jako…',
    duplicatePrefix: 'Duplikuj',
    duplicateSuffix: 'jako',
    newVariantName: 'Nazwa nowego wariantu',
    cancel: 'Anuluj',
    create: 'Utwórz',
    removeVariant: (name: string) => `Usuń „${name}”`,
    protectedHint: 'chronione',
    protectedTitle: 'Bazowe CV jest chronione',
    badName: 'Dozwolone: litery, cyfry, kropka, myślnik, podkreślnik.',
    nameTaken: (name: string) => `„${name}” już istnieje - wybierz inną nazwę.`,
    discardAndOpen: (name: string) => `Masz niezapisane zmiany. Odrzucić je i otworzyć „${name}”?`,
    confirmDelete: (name: string, lang: string) => `Usunąć „${name}” (wersja ${lang})? Tego nie da się cofnąć.`,
    discardAndSwitchLang: 'Masz niezapisane zmiany. Odrzucić je i przełączyć język?',
    createLangVersion: (name: string, lang: string) =>
      `„${name}” nie ma jeszcze wersji ${lang}. Utworzyć ją jako kopię obecnej treści (z nagłówkami ${lang}) do przetłumaczenia?`,
    missingLangVersion: (lang: string) => `Brak wersji ${lang} - kliknij, aby utworzyć`,
    changePhoto: 'Zmień zdjęcie',
    addPhoto: 'Dodaj zdjęcie',
    uploading: 'Wysyłanie…',
    photoUploadFailed: (reason: string) => `Nie udało się wgrać zdjęcia: ${reason}`,
    moveUp: 'Przesuń wyżej',
    moveDown: 'Przesuń niżej',
    remove: 'Usuń',
    present: 'obecnie',
    items: {
      paragraph: 'akapit',
      skillGroup: 'grupę skilli',
      job: 'stanowisko',
      project: 'projekt',
      bullet: 'punkt',
      education: 'wpis edukacji',
    } satisfies Record<ItemKind, string>,
  },
  en: {
    add: 'Add',
    switchInterfaceTo: 'Switch interface to Polish',
    preview: 'Preview',
    edit: 'Edit',
    mode: 'Mode',
    cvLanguage: 'CV language',
    undo: 'Undo',
    undoTitle: 'Undo the last change (Ctrl+Z)',
    save: 'Save',
    saveTitle: (name: string) => `Save changes to "${name}"`,
    nothingToSave: 'Nothing to save',
    unsaved: 'unsaved changes',
    pdfTitle: 'Download PDF (last saved version)',
    pdfUnsaved: 'You have unsaved changes - the PDF will use the last saved version. Download anyway?',
    pickVariant: 'Choose a CV variant',
    variants: 'CV variants',
    duplicateAs: 'Duplicate as…',
    duplicatePrefix: 'Duplicate',
    duplicateSuffix: 'as',
    newVariantName: 'New variant name',
    cancel: 'Cancel',
    create: 'Create',
    removeVariant: (name: string) => `Delete "${name}"`,
    protectedHint: 'protected',
    protectedTitle: 'The base CV is protected',
    badName: 'Allowed: letters, digits, dot, hyphen, underscore.',
    nameTaken: (name: string) => `"${name}" already exists - pick another name.`,
    discardAndOpen: (name: string) => `You have unsaved changes. Discard them and open "${name}"?`,
    confirmDelete: (name: string, lang: string) => `Delete "${name}" (${lang} version)? This can't be undone.`,
    discardAndSwitchLang: 'You have unsaved changes. Discard them and switch language?',
    createLangVersion: (name: string, lang: string) =>
      `"${name}" has no ${lang} version yet. Create it as a copy of the current content (with ${lang} headings) to translate?`,
    missingLangVersion: (lang: string) => `No ${lang} version - click to create it`,
    changePhoto: 'Change photo',
    addPhoto: 'Add photo',
    uploading: 'Uploading…',
    photoUploadFailed: (reason: string) => `Couldn't upload the photo: ${reason}`,
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Delete',
    present: 'present',
    items: {
      paragraph: 'paragraph',
      skillGroup: 'skill group',
      job: 'position',
      project: 'project',
      bullet: 'bullet point',
      education: 'education entry',
    } satisfies Record<ItemKind, string>,
  },
} as const;

export type UiStrings = (typeof UI)[UiLang];

const UiLangContext = createContext<UiLang>('en');

export function UiLangProvider({ value, children }: { value: UiLang; children: ReactNode }) {
  return <UiLangContext.Provider value={value}>{children}</UiLangContext.Provider>;
}

/** Interface strings in the current interface language. */
export function useT(): UiStrings {
  return UI[useContext(UiLangContext)];
}

const UI_LANG_KEY = 'cv-builder.uiLang';

/** The last interface language picked in this browser (defaults to English). */
export function loadUiLang(): UiLang {
  try {
    const stored = window.localStorage.getItem(UI_LANG_KEY);
    return stored === 'en' || stored === 'pl' ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function storeUiLang(lang: UiLang) {
  try {
    window.localStorage.setItem(UI_LANG_KEY, lang);
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }
}
