import { useEffect, useState } from 'react';
import { CvPage, getDataName, languageDefaults, loadCv, variantNames } from './cv';
import { EditModeProvider, Toolbar, UiLangProvider, loadUiLang, storeUiLang, type UiLang } from './editing';
import { useCvHistory } from './hooks/useCvHistory';

export default function App() {
  const dataName = getDataName();
  const [loaded] = useState(() => loadCv(dataName));
  const { cv, dirty, canUndo, setCv, undo, markSaved } = useCvHistory(loaded);
  const [editMode, setEditMode] = useState(false);
  const [uiLang, setUiLangState] = useState<UiLang>(loadUiLang);

  const setUiLang = (next: UiLang) => {
    setUiLangState(next);
    storeUiLang(next);
  };

  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, undo]);

  useEffect(() => {
    document.title = `${cv.profile.name} – CV`;
  }, [cv.profile.name]);

  return (
    <UiLangProvider value={uiLang}>
      <EditModeProvider value={editMode}>
        <main className="page">
          <Toolbar
            cv={cv}
            dataName={dataName}
            dirty={dirty}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onSaved={markSaved}
            canUndo={canUndo}
            onUndo={undo}
            variantNames={variantNames}
            languageDefaults={languageDefaults}
            uiLang={uiLang}
            onUiLangChange={setUiLang}
          />
          <CvPage cv={cv} onChange={setCv} />
        </main>
      </EditModeProvider>
    </UiLangProvider>
  );
}
