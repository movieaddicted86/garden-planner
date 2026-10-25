import { usePlanStore } from './state/use-plan-store.js';
import { BaseAreaPanel } from './components/BaseAreaPanel.js';
import { PlanView } from './components/PlanView.js';
import { APP_NAME } from './app-info';

/**
 * Application shell: the header with the product name and the plan's own controls, below it the plan and the
 * base-area panel beside it. The panel sits after the plan in the document (right of it on a wide screen, below
 * it on a narrow one), so the reading and tab order stay the same at every width. The planner screens (zones,
 * materials) are added by the roadmap tasks.
 */
export function App() {
  const fitProject = usePlanStore((state) => state.fitProject);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">{APP_NAME}</h1>
        {/* a real button with a text label: it works with the keyboard and needs no icon-only aria name */}
        <button type="button" className="fit-button" aria-label="Fit plan to view" onClick={fitProject}>
          Fit
        </button>
      </header>
      <div className="app-body">
        <main className="plan-view">
          <PlanView />
        </main>
        <BaseAreaPanel />
      </div>
    </div>
  );
}
