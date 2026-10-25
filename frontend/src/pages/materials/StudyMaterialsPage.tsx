import React, { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  RefreshCw,
  Layers,
  Database,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import type { DocumentListItem } from '../../types/api'

export const StudyMaterialsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'formulas'>('all')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await api.documents.list()
      setDocuments(docs)
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id)
      }
    } catch (err) {
      console.warn('Failed to load documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported for textbook grounding.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    setIsUploading(true)

    try {
      const res = await api.documents.upload(file)
      setUploadSuccess(`Document '${file.name}' successfully parsed: ${res.pages_count} pages, ${res.chunks_count} semantic chunks indexed.`)
      await loadDocuments()
      setSelectedDocId(res.document_id)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Active Document or Figma Reference
  const activeDoc = documents.find((d) => d.id === selectedDocId) || {
    id: 'demo-doc-01',
    title: 'Guyton and Hall Textbook of Medical Physiology (14th Ed.) - Chapter 28: Renal Circulation.pdf',
    pages_count: 24,
    chunks_count: 148,
    access_level: 'COURSE_SHARED' as const,
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header matching Figma */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">ExamTwin / Student Suite / Study Materials / Ingestion & Vector Pipeline</div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Study Materials: Ingestion & Document Inspector
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              • Live Engine
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl">
            Upload textbooks, syllabus PDFs, and lecture decks. Inspect vector chunking, OCR parsing, cosine grounding indexes, and token distributions.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="application/pdf"
            className="hidden"
          />
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 font-semibold text-xs py-2.5 px-4"
            leftIcon={<Upload className="w-4 h-4" />}
          >
            + Upload Material
          </Button>
        </div>
      </div>

      {/* Upload Messages */}
      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Main Document Details Card (Figma Exact) */}
      <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Vectorized & Grounded
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">Physiology</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">Renal & Hemodynamics</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">MCAT Section 2</span>
          </div>

          <button
            onClick={loadDocuments}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Index Chunks
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {activeDoc.title}
            </h2>
            <p className="text-xs text-slate-500">
              18.4 MB • {activeDoc.pages_count} Pages parsed • {activeDoc.chunks_count} Semantic Chunks • text-embedding-004 (768 dims)
            </p>
          </div>
        </div>

        {/* 4 Stats Cards matching Figma */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vector Coverage</span>
            <div className="text-xl font-black text-slate-900">{activeDoc.chunks_count} / {activeDoc.chunks_count} <span className="text-xs text-emerald-600 font-bold">100%</span></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg. Grounding Cosine</span>
            <div className="text-xl font-black text-slate-900">0.914 <span className="text-xs text-indigo-600 font-bold">High Fidelity</span></div>
            <p className="text-[10px] text-slate-400">Validated against syllabus specs</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Linked Quizzes</span>
            <div className="text-xl font-black text-slate-900">2 Active <span className="text-xs text-slate-500 font-normal">42 Questions</span></div>
            <p className="text-[10px] text-slate-400">Drill #14, Mini-Mock #6</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estimated Tokens</span>
            <div className="text-xl font-black text-slate-900">62,490 <span className="text-xs text-slate-500 font-normal">tokens</span></div>
            <p className="text-[10px] text-slate-400">~422 tokens per semantic block</p>
          </div>
        </div>
      </Card>

      {/* Two Column Grid: Vector Chunks & Chunk Grounding Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vector Chunks (5 cols) */}
        <div className="lg:col-span-5 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Vector Chunks <span className="text-xs font-normal text-slate-400">({activeDoc.chunks_count} indexed passages)</span>
            </h3>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('high')}
                className={`px-2 py-0.5 rounded ${activeTab === 'high' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                High Grounding
              </button>
              <button
                onClick={() => setActiveTab('formulas')}
                className={`px-2 py-0.5 rounded ${activeTab === 'formulas' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Formulas
              </button>
            </div>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="glomerular filtration autoregulation..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Chunks List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl border-2 border-indigo-600 bg-indigo-50/30 text-xs space-y-1.5 cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900">Chunk #42 • Page 342 • Sec 4.2</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">0.96 Match</span>
              </div>
              <p className="text-slate-600 line-clamp-2">
                "The myogenic mechanism functions essentially to protect the delicate glomerular capillaries from..."
              </p>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Tokens: 384 • 4 citations</span>
                <span className="font-bold text-indigo-600">Active Selection</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs space-y-1.5 cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Chunk #43 • Page 343 • Sec 4.3</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">0.89 Match</span>
              </div>
              <p className="text-slate-500 line-clamp-2">
                "Tubuloglomerular feedback relies critically on the macula densa cells sensing luminal NaCl delivery..."
              </p>
              <div className="text-[10px] text-slate-400">Tokens: 412 • 2 citations</div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs space-y-1.5 cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Chunk #44 • Page 344 • Sec 4.4</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">0.82 Match</span>
              </div>
              <p className="text-slate-500 line-clamp-2">
                "Angiotensin II acts predominantly on the efferent arteriole under hypovolemic conditions, preserving GFR..."
              </p>
              <div className="text-[10px] text-slate-400">Tokens: 340 • 6 citations</div>
            </div>
          </div>
        </div>

        {/* Right Column: Chunk Grounding Inspector (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-indigo-600">#42 Chunk Grounding Inspector</span>
              <p className="text-[11px] text-slate-400">Vector ID: vec_gnt_ch28_0x8F92A3</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button className="px-2.5 py-1 rounded bg-white text-slate-900 shadow-2xs">Bounding Box</button>
              <button className="px-2.5 py-1 rounded text-slate-500 hover:text-slate-900">Raw JSON</button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Source: Guyton & Hall, Page 342, Column B, Para 3</span>
              <span className="text-emerald-600 font-bold">OCR Confidence: 99.8%</span>
            </div>

            {/* Quoted and highlighted textbook excerpt */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-serif text-sm">
              "Autoregulation of Renal Blood Flow and GFR. Feedback mechanisms intrinsic to the kidneys normally keep renal blood flow and GFR relatively constant, despite marked changes in arterial blood pressure. These mechanisms still function in perfusing <mark className="bg-emerald-200 text-emerald-950 px-1 rounded">kidneys isolated from nervous control. The primary function of renal autoregulation is to maintain a relatively constant GFR and to allow precise control of renal excretion of water and solutes.</mark> The myogenic mechanism refers to the inherent capability of blood vessels to constrict when arterial pressure increases, safeguarding the glomerulus."
            </div>

            {/* Technical metrics */}
            <div className="grid grid-cols-4 gap-3 pt-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Cosine Vector</span>
                <span className="font-extrabold text-slate-900">0.9614</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Token Count</span>
                <span className="font-extrabold text-slate-900">384 tok</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Embedding Dims</span>
                <span className="font-extrabold text-slate-900">768 float</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase">Parser Engine</span>
                <span className="font-extrabold text-slate-900">PyMuPDF-v3</span>
              </div>
            </div>

            {/* Active AI Tutor Grounding Citations */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Active AI Tutor Grounding Citations (3)</span>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Renal Hemodynamics Tutor Query</span>
                    <p className="text-[11px] text-slate-500">"Explain why GFR remains stable between 80 to 180 mmHg MAP."</p>
                  </div>
                  <span className="text-[10px] text-slate-400">Invoked 12m ago</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">Diagnostic Drill #14 - Question #7</span>
                    <p className="text-[11px] text-slate-500">Grounding anchor for Option B explanation on Myogenic Vasoconstriction.</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold">MCAT Practice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
