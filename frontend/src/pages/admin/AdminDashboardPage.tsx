import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Database,
  FileText,
  BarChart3,
  Users,
  MessageSquare,
  Layers,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Download,
  X,
  AlertCircle,
  Lock,
  CheckCircle2,
  BookOpen,
  Table2,
  Activity,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import type {
  AdminOverviewResponse,
  AdminTableRowsResponse,
  AdminPdfDetailResponse,
  AdminPdfItem,
} from '../../types/api'

type AdminTab = 'visualizations' | 'pdfs' | 'tables'

const CHART_COLORS = [
  '#4F46E5', // indigo-600
  '#2563EB', // blue-600
  '#0D9488', // teal-600
  '#7C3AED', // violet-600
  '#EA580C', // orange-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#DB2777', // pink-600
  '#0284C7', // sky-600
  '#65A30D', // lime-600
  '#475569', // slate-600
]

function formatTimestamp(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export const AdminDashboardPage: React.FC = () => {
  const { student } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('visualizations')
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PDFs Tab State
  const [pdfSearch, setPdfSearch] = useState('')
  const [pdfStatusFilter, setPdfStatusFilter] = useState<string>('ALL')
  const [inspectingPdf, setInspectingPdf] = useState<AdminPdfDetailResponse | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null)

  // Database Tables Explorer State
  const [selectedTable, setSelectedTable] = useState<string>('students')
  const [tableData, setTableData] = useState<AdminTableRowsResponse | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [expandedCell, setExpandedCell] = useState<{ column: string; value: string } | null>(null)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.admin.getOverview()
      setOverview(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load administrator overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTable = useCallback(async (tableName: string) => {
    setTableLoading(true)
    try {
      const res = await api.admin.getTableRows(tableName, 250, 0)
      setTableData(res)
    } catch (err) {
      console.warn('Failed to load table rows:', err)
      setTableData(null)
    } finally {
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
    if (student?.is_admin) {
      loadOverview()
    } else {
      setLoading(false)
    }
  }, [student?.is_admin, loadOverview])

  useEffect(() => {
    if (student?.is_admin && activeTab === 'tables' && selectedTable) {
      loadTable(selectedTable)
    }
  }, [student?.is_admin, activeTab, selectedTable, loadTable])

  const handleJumpToTable = (tableName: string) => {
    setSelectedTable(tableName)
    setTableSearch('')
    setActiveTab('tables')
  }

  const handleInspectPdf = async (pdf: AdminPdfItem) => {
    setInspectLoading(true)
    setInspectingPdf(null)
    try {
      const detail = await api.admin.getPdfDetail(pdf.id)
      setInspectingPdf(detail)
    } catch (err) {
      console.warn('Failed to load PDF detail:', err)
    } finally {
      setInspectLoading(false)
    }
  }

  const handleDeletePdf = async (pdf: AdminPdfItem) => {
    if (!window.confirm(`Delete PDF "${pdf.title}" uploaded by ${pdf.owner_user_id}? This removes all extracted pages and vector chunks.`)) {
      return
    }
    setDeletingPdfId(pdf.id)
    try {
      await api.admin.deletePdf(pdf.id)
      await loadOverview()
      if (activeTab === 'tables' && ['documents', 'document_pages', 'document_chunks'].includes(selectedTable)) {
        await loadTable(selectedTable)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete PDF.')
    } finally {
      setDeletingPdfId(null)
    }
  }

  const filteredPdfs = useMemo(() => {
    if (!overview) return []
    return overview.pdfs.filter((pdf) => {
      if (pdfStatusFilter !== 'ALL' && pdf.processing_status !== pdfStatusFilter) return false
      if (!pdfSearch.trim()) return true
      const q = pdfSearch.toLowerCase()
      return (
        pdf.title.toLowerCase().includes(q) ||
        pdf.id.toLowerCase().includes(q) ||
        pdf.owner_user_id.toLowerCase().includes(q) ||
        (pdf.owner_email || '').toLowerCase().includes(q) ||
        (pdf.owner_full_name || '').toLowerCase().includes(q)
      )
    })
  }, [overview, pdfSearch, pdfStatusFilter])

  const filteredTableRows = useMemo(() => {
    if (!tableData) return []
    if (!tableSearch.trim()) return tableData.rows
    const q = tableSearch.toLowerCase()
    return tableData.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    )
  }, [tableData, tableSearch])

  const handleExportCsv = () => {
    if (!tableData) return
    const header = tableData.columns.join(',')
    const lines = filteredTableRows.map((row) =>
      tableData.columns
        .map((col) => {
          const val = row[col]
          const str = val === null || val === undefined ? '' : String(val)
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tableData.table_name}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // SVG Donut chart segments for platform data composition
  const donutSegments = useMemo(() => {
    if (!overview) return []
    const s = overview.summary
    const raw = [
      { label: 'Users & Students', value: s.total_users, color: '#4F46E5' },
      { label: 'PDFs & Pages', value: s.total_pdfs + s.total_pages, color: '#2563EB' },
      { label: 'Vector Chunks', value: s.total_chunks, color: '#0D9488' },
      { label: 'Tutor Chats', value: s.total_chat_messages, color: '#7C3AED' },
      {
        label: 'Diagnostics & Assessments',
        value: s.total_diagnoses + s.total_mastery_records + s.total_assessments + s.total_ai_practice_records,
        color: '#EA580C',
      },
      { label: 'Tickets & OTPs', value: Math.max(0, s.total_rows - (s.total_users + s.total_pdfs + s.total_pages + s.total_chunks + s.total_chat_messages + s.total_diagnoses + s.total_mastery_records + s.total_assessments + s.total_ai_practice_records)), color: '#64748B' },
    ]
    const total = raw.reduce((acc, item) => acc + item.value, 0)
    const radius = 58
    const circumference = 2 * Math.PI * radius
    let cumulative = 0

    return raw.map((item) => {
      const fraction = total > 0 ? item.value / total : 0
      const dash = fraction * circumference
      const offset = -cumulative * circumference
      cumulative += fraction
      return {
        ...item,
        percent: total > 0 ? Math.round(fraction * 100) : 0,
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: offset,
      }
    })
  }, [overview])

  // Strict UI Guard for non-admin users
  if (!student?.is_admin) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
        <p className="text-sm text-slate-500">
          This console is restricted to administrator accounts. Sign in with an admin account to view all PDFs and database analytics.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Admin Console &amp; Database Explorer
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Full DB Access
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Inspect every PDF across all students, explore all database tables &amp; rows, and monitor live platform visualizations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              loadOverview()
              if (activeTab === 'tables') loadTable(selectedTable)
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Refresh Live DB</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !overview ? (
        <div className="py-20 text-center">
          <LoadingSpinner message="Loading live database metrics, PDF catalog, and table visualizations..." />
        </div>
      ) : overview ? (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>DB Tables</span>
                <Database className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{overview.summary.total_tables}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{overview.summary.total_rows} total rows</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>All PDFs</span>
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{overview.summary.total_pdfs}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{overview.summary.total_pages} extracted pages</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Vector Chunks</span>
                <Layers className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{overview.summary.total_chunks}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Indexed for AI RAG</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Accounts</span>
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{overview.summary.total_users}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {overview.summary.total_students} student{overview.summary.total_students === 1 ? '' : 's'} • {overview.summary.total_admins} admin
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Tutor Chats</span>
                <MessageSquare className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{overview.summary.total_chat_messages}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Saved messages</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Diagnostics</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                {overview.summary.total_diagnoses + overview.summary.total_assessments}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {overview.summary.total_mastery_records} mastery records
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-2xs gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('visualizations')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'visualizations'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Data Visualizations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdfs')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'pdfs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>All PDFs in Database</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'pdfs' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {overview.pdfs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'tables'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>All Database Tables</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'tables' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {overview.table_stats.length}
              </span>
            </button>
          </div>

          {/* ========================================================== */}
          {/* TAB 1: DATA VISUALIZATIONS                                 */}
          {/* ========================================================== */}
          {activeTab === 'visualizations' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Interactive Bar Chart of ALL Database Tables */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Records Across All Database Tables
                      </h2>
                      <p className="text-xs text-slate-500">
                        Click any table bar to inspect its live rows and columns.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                      {overview.table_stats.length} Tables
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {(() => {
                      const maxRows = Math.max(1, ...overview.table_stats.map((t) => t.row_count))
                      return overview.table_stats.map((tbl, idx) => {
                        const pct = tbl.row_count > 0 ? Math.max(4, Math.round((tbl.row_count / maxRows) * 100)) : 0
                        const color = CHART_COLORS[idx % CHART_COLORS.length]
                        return (
                          <button
                            key={tbl.table_name}
                            type="button"
                            onClick={() => handleJumpToTable(tbl.table_name)}
                            className="w-full text-left group p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-semibold text-slate-800 group-hover:text-indigo-700 truncate">
                                  {tbl.display_name}
                                </span>
                                <code className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline">
                                  {tbl.table_name}
                                </code>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400">{tbl.column_count} cols</span>
                                <span className="font-bold text-slate-900 tabular-nums w-10 text-right">
                                  {tbl.row_count}
                                </span>
                              </div>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Chart 2: SVG Donut Chart of Platform Data Composition */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Data Composition</h2>
                    <p className="text-xs text-slate-500">
                      Proportional share of stored records across subsystems.
                    </p>
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-44 h-44">
                      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="58"
                          fill="none"
                          stroke="#F1F5F9"
                          strokeWidth="18"
                        />
                        {donutSegments.map((seg) =>
                          seg.value > 0 ? (
                            <circle
                              key={seg.label}
                              cx="80"
                              cy="80"
                              r="58"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="18"
                              strokeDasharray={seg.dashArray}
                              strokeDashoffset={seg.dashOffset}
                              strokeLinecap="butt"
                            />
                          ) : null
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-extrabold text-slate-900">
                          {overview.summary.total_rows}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">Total Rows</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {donutSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span className="text-slate-700 font-medium">{seg.label}</span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {seg.value} <span className="text-slate-400 font-normal">({seg.percent}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Second Row of Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 3: PDFs & Chunks per Student */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">PDFs &amp; Chunks by User</h3>
                      <p className="text-xs text-slate-500">Uploaded material volume per account</p>
                    </div>
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>

                  {overview.charts.pdfs_by_student.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No PDFs uploaded in the database yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const maxPdfs = Math.max(1, ...overview.charts.pdfs_by_student.map((x) => x.pdf_count))
                        return overview.charts.pdfs_by_student.map((row) => (
                          <div key={row.owner_user_id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 truncate">{row.student}</span>
                              <span className="text-slate-600 font-medium shrink-0">
                                {row.pdf_count} PDF{row.pdf_count === 1 ? '' : 's'} • {row.pages_count}p • {row.chunks_count} chunks
                              </span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                style={{ width: `${Math.max(8, Math.round((row.pdf_count / maxPdfs) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>

                {/* Chart 4: AI Tutor Chat Mode & Sender Split */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">AI Tutor Activity</h3>
                      <p className="text-xs text-slate-500">Breakdown by mode &amp; participant</p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                  </div>

                  {overview.charts.chat_by_mode.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No tutor chat messages stored yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          By Tutor Mode
                        </span>
                        {(() => {
                          const total = Math.max(
                            1,
                            overview.charts.chat_by_mode.reduce((a, b) => a + b.count, 0)
                          )
                          return overview.charts.chat_by_mode.map((item) => {
                            const pct = Math.round((item.count / total) * 100)
                            const label =
                              item.mode === 'qa'
                                ? 'Concept Q&A'
                                : item.mode === 'hint'
                                ? 'Socratic Hint'
                                : item.mode === 'practice'
                                ? 'Practice Drill'
                                : item.mode
                            return (
                              <div key={item.mode} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-slate-700">{label}</span>
                                  <span className="font-bold text-slate-900">
                                    {item.count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-violet-600 rounded-full"
                                    style={{ width: `${Math.max(4, pct)}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        {overview.charts.chat_by_sender.map((s) => (
                          <div
                            key={s.sender}
                            className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center"
                          >
                            <p className="text-lg font-extrabold text-slate-900">{s.count}</p>
                            <p className="text-[11px] font-medium text-slate-500 capitalize">
                              {s.sender} Messages
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart 5: Mastery Distribution Column Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Topic Mastery Distribution</h3>
                      <p className="text-xs text-slate-500">Score buckets across all students</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="h-40 flex items-end justify-around gap-3 pt-4 px-2 border-b border-slate-200">
                    {(() => {
                      const maxBucket = Math.max(
                        1,
                        ...overview.charts.mastery_distribution.map((b) => b.count)
                      )
                      const barColors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']
                      return overview.charts.mastery_distribution.map((b, i) => {
                        const heightPct = b.count > 0 ? Math.max(12, Math.round((b.count / maxBucket) * 100)) : 4
                        return (
                          <div key={b.bucket} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                            <span className="text-xs font-bold text-slate-800">{b.count}</span>
                            <div
                              className={`w-full max-w-[44px] rounded-t-lg transition-all duration-500 ${
                                b.count > 0 ? barColors[i % barColors.length] : 'bg-slate-200'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                        )
                      })
                    })()}
                  </div>
                  <div className="flex items-center justify-around gap-3 px-2 text-[11px] font-semibold text-slate-500">
                    {overview.charts.mastery_distribution.map((b) => (
                      <span key={b.bucket} className="flex-1 text-center">
                        {b.bucket}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: ALL PDFs IN DATABASE                                */}
          {/* ========================================================== */}
          {activeTab === 'pdfs' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    All Uploaded PDFs Across All Accounts ({filteredPdfs.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    View, inspect extracted pages, or manage every PDF document stored in the database.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pdfSearch}
                      onChange={(e) => setPdfSearch(e.target.value)}
                      placeholder="Search PDF title, owner, email..."
                      className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                    />
                  </div>
                  <select
                    value={pdfStatusFilter}
                    onChange={(e) => setPdfStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PROCESSED">Processed</option>
                    <option value="UPLOADED">Uploaded</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              {filteredPdfs.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No PDF documents found</p>
                  <p className="text-xs text-slate-500">
                    When students upload PDFs in Study Materials, every file will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-bold">Document Title</th>
                        <th className="px-4 py-3 font-bold">Owner Account</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Access</th>
                        <th className="px-4 py-3 font-bold text-right">Pages</th>
                        <th className="px-4 py-3 font-bold text-right">Chunks</th>
                        <th className="px-4 py-3 font-bold">Uploaded</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPdfs.map((pdf) => (
                        <tr key={pdf.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate max-w-xs" title={pdf.title}>
                                  {pdf.title}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">{pdf.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-800">
                              {pdf.owner_full_name || pdf.owner_user_id}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {pdf.owner_email || `@${pdf.owner_user_id}`}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                pdf.processing_status === 'PROCESSED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : pdf.processing_status === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {pdf.processing_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                              {pdf.access_level}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-800 tabular-nums">
                            {pdf.pages_count}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-800 tabular-nums">
                            {pdf.chunks_count}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {formatTimestamp(pdf.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInspectPdf(pdf)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePdf(pdf)}
                                disabled={deletingPdfId === pdf.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 font-semibold text-[11px] transition-colors disabled:opacity-50"
                                title="Delete PDF"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: FULL DATABASE TABLES EXPLORER (ALL TABLES & VALUES) */}
          {/* ========================================================== */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* Table Selector Pills */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Database Table ({overview.table_stats.length} Tables)
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Sensitive credentials are safely masked as [REDACTED]
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overview.table_stats.map((tbl) => {
                    const isSelected = selectedTable === tbl.table_name
                    return (
                      <button
                        key={tbl.table_name}
                        type="button"
                        onClick={() => {
                          setSelectedTable(tbl.table_name)
                          setTableSearch('')
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{tbl.display_name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {tbl.row_count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Active Table Data Grid */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {tableData?.display_name || selectedTable}
                      </h3>
                      <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {selectedTable}
                      </code>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Showing {filteredTableRows.length} of {tableData?.total_rows ?? 0} total rows • {tableData?.columns.length ?? 0} columns
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Filter rows in this table..."
                        className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={!tableData || filteredTableRows.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {tableLoading ? (
                  <div className="p-12 text-center">
                    <LoadingSpinner message={`Querying table "${selectedTable}"...`} />
                  </div>
                ) : !tableData || filteredTableRows.length === 0 ? (
                  <div className="p-12 text-center space-y-1.5">
                    <Database className="w-9 h-9 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">
                      {tableData && tableData.total_rows > 0
                        ? 'No matching rows for your search filter'
                        : `Table "${selectedTable}" currently has 0 rows`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Columns defined: {tableData?.columns.join(', ') || '—'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[560px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3.5 py-2.5 font-bold text-slate-500 text-[11px] uppercase w-10">
                            #
                          </th>
                          {tableData.columns.map((col) => (
                            <th
                              key={col}
                              className="px-3.5 py-2.5 font-bold text-slate-700 font-mono text-[11px] whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTableRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3.5 py-2.5 text-slate-400 font-mono text-[11px]">
                              {rowIdx + 1}
                            </td>
                            {tableData.columns.map((col) => {
                              const val = row[col]
                              if (val === null || val === undefined) {
                                return (
                                  <td key={col} className="px-3.5 py-2.5 text-slate-300 italic font-mono text-[11px]">
                                    NULL
                                  </td>
                                )
                              }
                              if (typeof val === 'boolean') {
                                return (
                                  <td key={col} className="px-3.5 py-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        val
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      {String(val)}
                                    </span>
                                  </td>
                                )
                              }
                              const str = String(val)
                              if (str === '[REDACTED]') {
                                return (
                                  <td key={col} className="px-3.5 py-2.5">
                                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px]">
                                      [REDACTED]
                                    </span>
                                  </td>
                                )
                              }
                              if (str.startsWith('[Vector:')) {
                                return (
                                  <td key={col} className="px-3.5 py-2.5">
                                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono text-[10px] whitespace-nowrap">
                                      {str}
                                    </span>
                                  </td>
                                )
                              }
                              const isLong = str.length > 70
                              return (
                                <td key={col} className="px-3.5 py-2.5 text-slate-700 max-w-xs">
                                  {isLong ? (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedCell({ column: col, value: str })}
                                      className="text-left hover:text-indigo-700 hover:underline truncate block max-w-[240px]"
                                      title="Click to inspect full text"
                                    >
                                      {str}
                                    </button>
                                  ) : (
                                    <span className="whitespace-nowrap">{str}</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* PDF Page Inspector Modal */}
      {(inspectLoading || inspectingPdf) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {inspectingPdf ? inspectingPdf.title : 'Loading PDF Details...'}
                </h3>
                {inspectingPdf && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Owner: <strong>{inspectingPdf.owner_full_name || inspectingPdf.owner_user_id}</strong> ({inspectingPdf.owner_email || inspectingPdf.owner_user_id}) • {inspectingPdf.pages_count} Pages • {inspectingPdf.chunks_count} Chunks
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectingPdf(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectLoading ? (
                <div className="py-12 text-center">
                  <LoadingSpinner message="Loading extracted PDF pages..." />
                </div>
              ) : inspectingPdf && inspectingPdf.pages.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No extracted page text found for this document.
                </p>
              ) : (
                inspectingPdf?.pages.map((page) => (
                  <div
                    key={page.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700">Page {page.page_number}</span>
                      <span className="text-slate-400">{page.char_count} characters</span>
                    </div>
                    <pre className="p-4 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                      {page.text}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Long Cell Text Viewer Modal */}
      {expandedCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold font-mono text-indigo-700">{expandedCell.column}</span>
              <button
                type="button"
                onClick={() => setExpandedCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {expandedCell.value}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
