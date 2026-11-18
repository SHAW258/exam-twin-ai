import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, CheckCircle2, RefreshCw, Bot, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner, EmptyState } from '../../components/ui/LoadingAndEmpty'
import { api } from '../../api/client'
import { cleanDocName } from '../../utils/document'
import type { DocumentListItem } from '../../types/api'

export const StudyMaterialsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    try {
      const docs = await api.documents.list()
      setDocuments(docs)
      if (docs.length > 0 && !selectedDocId) setSelectedDocId(docs[0].id)
    } catch (err) {
      console.warn('Failed to load documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadDocuments() }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) { setUploadError('Please upload a PDF file.'); return }
    setIsUploading(true); setUploadError(null); setUploadSuccess(null)
    try {
      const result = await api.documents.upload(file)
      setUploadSuccess(`"${cleanDocName(result.filename)}" uploaded successfully.`)
      await loadDocuments()
      setSelectedDocId(result.document_id)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (docId: string) => {
    try { await api.documents.delete(docId); if (selectedDocId === docId) setSelectedDocId(null); await loadDocuments() }
    catch (err) { console.warn('Delete failed:', err) }
  }

  const activeDoc = documents.find(d => d.id === selectedDocId)
  const totalChunks = documents.reduce((sum, d) => sum + d.chunks_count, 0)

  if (isLoading) {
    return <div className="py-20 flex flex-col items-center justify-center space-y-4"><LoadingSpinner size="lg" /><p className="text-xs text-slate-500 font-medium">Loading study materials...</p></div>
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">CodeKnot / Study Materials</div>
          <h1 className="text-2xl font-extrabold text-[#14213D] tracking-tight">Study Materials</h1>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">Upload your PDF syllabus, lecture slides, or notes. CodeKnot uses them for grounded tutoring and PDF-based practice.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="pdf-upload-input" />
          <Button variant="primary" size="md" className="bg-[#2563EB] hover:bg-[#1d4ed8]" isLoading={isUploading} leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? 'Uploading...' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      {uploadSuccess && <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>{uploadSuccess}</span></div>}
      {uploadError && <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{uploadError}</span></div>}

      {documents.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-sm"><FileText className="w-8 h-8" /></div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No study materials uploaded yet</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">Upload a PDF to start asking grounded questions and generating practice quizzes from your own material.</p>
          </div>
          <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />} className="bg-[#2563EB] hover:bg-[#1d4ed8]" onClick={() => fileInputRef.current?.click()}>Upload Your First PDF</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Uploaded PDFs</h2>
                <button onClick={loadDocuments} className="text-slate-400 hover:text-slate-700 p-1 rounded" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <button key={doc.id} type="button" onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1 ${selectedDocId === doc.id ? 'bg-blue-50/50 border-[#2563EB] shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                    <p className="text-xs font-bold text-slate-900 truncate">{cleanDocName(doc.title)}</p>
                    <p className="text-[11px] text-slate-500">{doc.pages_count} page{doc.pages_count === 1 ? '' : 's'} • {doc.chunks_count} indexed sections</p>
                    <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.chunks_count > 0 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {doc.chunks_count > 0 ? 'Ready for AI' : 'Needs review'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">{documents.length} PDF(s) • {totalChunks} indexed sections available</div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            {activeDoc ? (
              <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{cleanDocName(activeDoc.title)}</h2>
                    <p className="text-xs text-slate-500">{activeDoc.pages_count} page{activeDoc.pages_count === 1 ? '' : 's'} processed</p>
                  </div>
                  <button onClick={() => handleDelete(activeDoc.id)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50" title="Remove PDF"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1"><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pages</span><div className="text-2xl font-black text-slate-900">{activeDoc.pages_count}</div></div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1"><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</span><div className="text-lg font-black text-slate-900">{activeDoc.chunks_count > 0 ? 'Ready' : 'Check upload'}</div><p className="text-[10px] text-slate-400">{activeDoc.chunks_count > 0 ? 'Available for tutor & practice' : 'Re-upload if needed'}</p></div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                  <Link to="/tutor"><Button variant="primary" size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" leftIcon={<Bot className="w-4 h-4" />}>Ask AI Tutor</Button></Link>
                  <Link to="/practice"><Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4" />}>Generate Practice</Button></Link>
                </div>
              </Card>
            ) : (
              <EmptyState icon={<FileText className="w-6 h-6" />} title="Select a PDF" description="Choose an uploaded PDF to view its details and use it for tutoring or practice." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}