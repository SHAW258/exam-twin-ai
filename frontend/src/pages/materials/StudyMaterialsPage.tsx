import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  RefreshCw,
  Layers,
  Bot,
  AlertCircle,
  FileCheck,
  Calendar,
  Lock,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await api.documents.list()
      setDocuments(docs)
      if (docs.length > 0 && (!selectedDocId || !docs.some((d) => d.id === selectedDocId))) {
        setSelectedDocId(docs[0].id)
      } else if (docs.length === 0) {
        setSelectedDocId(null)
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
      setUploadError('Only PDF documents are supported for textbook and lecture grounding.')
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

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const activeDoc = documents.find((d) => d.id === selectedDocId) || null

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            ExamTwin / Student Suite / Study Materials / Ingestion & Vector Library
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Study Materials Library
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {documents.length} Document{documents.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
            Upload course syllabus PDFs, lecture slides, and textbook excerpts. ExamTwin extracts text, generates vector embeddings, and grounds your AI Study Twin strictly in your uploaded materials.
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
            + Upload PDF Material
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

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-slate-500 font-medium">Loading uploaded materials...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Study Materials Uploaded Yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Upload your syllabus or lecture PDF to extract text, generate vector embeddings, and ground your AI Tutor in your real course content.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Your First PDF
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Documents List (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Your Documents ({documents.length})
              </h3>
              <button
                onClick={loadDocuments}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                title="Refresh document list"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search uploaded documents..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Document Items List */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredDocs.map((doc) => {
                const isSelected = doc.id === selectedDocId
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="font-bold truncate">{doc.title}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        Indexed
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                      <span>{doc.pages_count} Pages • {doc.chunks_count} Chunks</span>
                      <span className="capitalize">{doc.access_level.toLowerCase()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Document Inspector (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
            {activeDoc ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Grounded in MySQL Vector Store
                  </span>

                  <Link to="/tutor">
                    <Button size="sm" variant="outline" className="text-xs" leftIcon={<Bot className="w-3.5 h-3.5" />}>
                      Ask Tutor About This Document
                    </Button>
                  </Link>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-all">
                      {activeDoc.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      ID: <span className="font-mono">{activeDoc.id}</span>
                      {activeDoc.created_at && ` • Uploaded ${new Date(activeDoc.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pages Parsed</span>
                    <div className="text-xl font-black text-slate-900">{activeDoc.pages_count}</div>
                    <p className="text-[10px] text-slate-400">PDF pages processed</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Semantic Chunks</span>
                    <div className="text-xl font-black text-slate-900">{activeDoc.chunks_count}</div>
                    <p className="text-[10px] text-slate-400">Indexed for RAG</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Privacy Mode</span>
                    <div className="text-xl font-black text-slate-900 capitalize">{activeDoc.access_level.toLowerCase()}</div>
                    <p className="text-[10px] text-slate-400">Restricted to your account</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Embedding Model</span>
                    <div className="text-xl font-black text-slate-900">768-dim</div>
                    <p className="text-[10px] text-slate-400">Cosine index active</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Evidence-Grounded Tutoring Ready</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    This document is ingested, chunked, and embedded. When you ask conceptual questions in the AI Tutor or take diagnostic drills, the retrieval engine queries these semantic chunks and cites exact page numbers.
                  </p>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Select a document from the left list to view details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
