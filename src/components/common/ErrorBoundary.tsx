import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, Compass, ChevronDown } from 'lucide-react';
import { loadSavedProject } from '../../services/storage/projectStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExportingDump: boolean;
  dumpExported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isExportingDump: false,
      dumpExported: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[Vis-Scope Crash Guard] Uncaught runtime exception:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleEmergencyExport = async (): Promise<void> => {
    this.setState({ isExportingDump: true });
    try {
      const project = await loadSavedProject();
      const jsonStr = JSON.stringify(project, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vis_Scope_Emergency_Recovery_${project.project_id}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.setState({ dumpExported: true });
    } catch (err) {
      console.error('[Vis-Scope] Failed to export recovery dump:', err);
    } finally {
      this.setState({ isExportingDump: false });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center">
            {/* Vis-Scope Logo & Alert Icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center mb-5">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono mb-3">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Vis-Scope Crash Guard</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              An unexpected display error occurred
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Don't worry — your inspection floor plan and room data are securely preserved in your local IndexedDB storage.
            </p>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyExport}
                disabled={this.state.isExportingDump}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>
                  {this.state.dumpExported
                    ? 'Recovery Backup Saved!'
                    : this.state.isExportingDump
                    ? 'Saving...'
                    : 'Download Emergency Backup'}
                </span>
              </button>
            </div>

            {/* Technical Error Details Accordion */}
            {this.state.error && (
              <details className="mt-6 text-left group">
                <summary className="cursor-pointer text-xs font-mono text-slate-500 hover:text-slate-400 flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 transition">
                  <span>Diagnostic Error Details</span>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-rose-300 overflow-x-auto max-h-40">
                  <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[10px] text-slate-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack.trim()}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
