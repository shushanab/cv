import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  POLLING_DELAY,
  PDF_STATUS,
} from "../../constants/index.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLoading } from "../../components/Base/Loading/LoadingContext";

import PaperService from "../../services/PaperService";
import ExtractionService from "../../services/ExtractionService";
import ProjectService from "../../services/ProjectService";

import useClickAway from "../../hooks/useClickAway";
import useDownloadsColumns from "../../hooks/useDownloadsColumns";

import QueryBox from "../../components/Query/QueryBox";
import Button from "../../components/Base/Button/Button";
import Tooltip from "../../components/Base/Tooltip";
import IconButton from "../../components/Base/IconButton/IconButton";
import FileUploaderModal from "../../components/FileUploader/FileUploaderModal.jsx";
import InsertRowModal from "../../components/FileUploader/InsertRawModal.jsx";
import DataTableComponent from "../../components/Base/DataTable/DataTable";
import DataTableDetails from "../../components/Base/DataTable/DataTableDetails";
import ChatBox from "../../components/Base/ChatBox/ChatBox";
import FileViewer from "../../components/Base/DataTable/FileViewer";

import {
  faPlus,
  faAngleLeft,
} from "@fortawesome/free-solid-svg-icons";
import { showToast } from "../../components/Base/Toast/Toast.jsx";

export default function Downloads() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { showLoading, hideLoading } = useLoading();
  const queryFromStore = useSelector((s) => s.paper?.query ?? "");
  const queryValue = queryFromStore;

  const [uploadRow, setUploadRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [results, setResults] = useState([]);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [toggleCleared, setToggleCleared] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInsertRowModal, setShowInsertRowModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState("");
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showExclusionPopup, setShowExclusionPopup] = useState(false);
  const [exclusionMap, setExclusionMap] = useState({}); // { [rowId]: 'E1' | null }

  const popupRef = useRef(null);
  const infoRef = useRef();
  const pollingRef = useRef(null);
  const exclusionInfoRef = useRef(null);
  const exclusionPopupRef = useRef(null);

  const hasQuery = queryValue && Object.keys(queryValue).length > 0;
  const isRowExcluded = (row) => !!exclusionMap[row.id];
  const isRowSelected = (row) => selectedIds.includes(row.id);

  const { PDF_CREATED, PDF_IN_QUEUE, PDF_PROCESSING, PDF_SUCCESS, PDF_FAILED } =
    PDF_STATUS;

  const searchableColumns = [
    "title",
    "doi",
    "author",
    "publicationDate",
    "status",
  ];

  const conditionalRowStyles = [
    {
      when: (row) => row.id === selectedRowId,
      classNames: ["selected-row"],
      style: {
        borderLeft: "5px solid var(--primary-color)",
        backgroundColor: "#EEF6FF",
      },
    },
  ];

  const pendingCodes = [PDF_CREATED, PDF_IN_QUEUE, PDF_PROCESSING];

  const statusColorMap = {
    Downloaded: "var(--success-color)",
    Uploaded: "var(--success-color)",
    "In Queue": "var(--primary-color)",
    Failed: "var(--error-color)",
    "Paywall restricted": "var(--warning-color)",
    "Temporary Technical issue": "var(--yellow-color)",
    "Download Script Unavailable": "var(--error-color)",
    "Not Available": "var(--warning-color)",
  };
  
  const getStatusColor = (status) =>
    statusColorMap[status] || "var(--text-color)";

  const toggleRowExpanded = (rowId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setSelectedRowId(row.id);
    setShowDetails(true);
    setShowViewer(false);
    setShowChat(false);
  };

  const handleExclusionChange = (rowId, code) => {
    setExclusionMap((m) => ({ ...m, [rowId]: code }));

    if (code) {
      setSelectedIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  const handleOpenViewer = (row) => {
    const downloadableLink = row.pdf_links?.find((l) => l.downloadable);
    if (!downloadableLink) {
      showToast("No downloadable PDF for this paper", "error");
      return;
    }
    const url = ProjectService.getPdfStreamUrl(
      projectId,
      row.id,
      downloadableLink.id
    );
    setGeneratedPdfUrl(url);
    setSelectedRow(row);
    setSelectedRowId(row.id);
    setShowViewer(true);
    setShowDetails(false);
    setShowChat(false);
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setShowDetails(false);
    setSelectedRow(null);
    setShowChat(false);
  };

  const handleOpenUpload = (row) => {
    setUploadRow(row);
    setShowUploadModal(true);
  };

  const handleOpenChat = () => {
    setShowChat(true);
    setShowDetails(false);
    setShowViewer(false);
    setSelectedRow(null);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  // Use the new columns hook
  const columns = useDownloadsColumns({
    expandedRows,
    selectedRowId,
    exclusionMap,
    isRowSelected,
    handleRowClick,
    toggleRowExpanded,
    handleExclusionChange,
    handleOpenUpload,
    handleOpenViewer,
    showInfoPopup,
    setShowInfoPopup,
    infoRef,
    popupRef,
    showExclusionPopup,
    setShowExclusionPopup,
    exclusionInfoRef,
    exclusionPopupRef,
    getStatusColor,
  });

  // 1) Initial load + start polling
  useEffect(() => {
    if (!projectId) return;

    let firstLoad = true;
    const init = async () => {
      try {
        showLoading();
        const r = await ProjectService.getPapers(projectId);
        setResults(r.data.data || []);
      } catch (e) {
        showToast("Downloaded papers not found", "error");
        console.error(e);
      } finally {
        hideLoading();
      }

      if (firstLoad) {
        pollingRef.current = setInterval(
          handleUpdateDownloadStatus,
          POLLING_DELAY
        );
        firstLoad = false;
      }
    };

    init();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [projectId]);

  // 2) Stop polling when no more pending statuses
  useEffect(() => {
    const hasAnyPending = results.some((row) =>
      row.pdf_links?.some((link) => pendingCodes.includes(link.status))
    );

    if (!hasAnyPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [results]);

  useClickAway(showInfoPopup, setShowInfoPopup, infoRef, popupRef);
  useClickAway(
    showExclusionPopup,
    setShowExclusionPopup,
    exclusionInfoRef,
    exclusionPopupRef
  );

  const loadItems = async () => {
    try {
      showLoading();
      const r = await ProjectService.getPapers(projectId);
      setResults(r.data.data || []);
    } catch (e) {
      showToast("Downloaded papers not found", "error");
      console.error(e);
    } finally {
      hideLoading();
    }
  };

  const handleUpdateDownloadStatus = async () => {
    try {
      const updates = await ProjectService.updateDownloadStatus(projectId);
      if (!Array.isArray(updates) || updates.length === 0) return;

      setResults((prev) =>
        prev.map((item) => {
          const hit = updates.find((u) => u.paper_id === item.id);
          if (!hit) return item;

          const patchedLinks = item.pdf_links.map((link) => {
            const upd = hit.pdf_links.find((upl) => upl.id === link.id);
            return upd ? { ...link, status: upd.status, path: upd.path } : link;
          });

          const patchedScore = {
            relevance_score: hit.relevance_score,
            narrative: hit.narrative,
          };

          return { ...item, pdf_links: patchedLinks, score: patchedScore };
        })
      );
    } catch (e) {
      showToast(e.response?.data?.message || "Error updating status");
      console.error("Error updating download status:", e);
    }
  };

  const handleUploadSubmit = async (files, confirm) => {
    try {
      showLoading();
      await PaperService.uploadPapers(projectId, uploadRow.id, {
        pdf: files[0],
        confirm,
      });
      setShowUploadModal(false);
      setUploadRow(null);
      loadItems();
    } catch (e) {
      showToast(e.response.data.message || e, "error");
      showToast(e, "error");
      console.error(e);
    } finally {
      hideLoading();
    }
  };

  const handleUploadCancel = () => {
    setShowUploadModal(false);
    setUploadRow(null);
  };

  const handleOpenInsertRow = () => {
    setShowInsertRowModal(true);
  };

  const handleInsertRowSubmit = async (metadata) => {
    try {
      showLoading();
      await PaperService.insertPaper(projectId, metadata);
      setShowInsertRowModal(false);
      loadItems();
    } catch (e) {
      showToast(e.response.data.message, "error");
      console.error(e);
    } finally {
      hideLoading();
    }
  };

  const handleCancel = () => {
    setSelectedIds([]);
    setToggleCleared((prev) => !prev);
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}/papers`);
  };

  const handleDataExtraction = async () => {
    try {
      showLoading();
      const selectedArticles = results.filter((r) =>
        selectedIds.includes(r.id)
      );
      const availablePdfLinkIds = selectedArticles
        .flatMap((a) =>
          a.pdf_links?.filter((pdf) => pdf.downloadable)?.map((pdf) => pdf.id)
        )
        .filter(Boolean);
      await ExtractionService.extractBulkPdf({
        pdf_link_ids: availablePdfLinkIds,
      });
      navigate(`/projects/${projectId}/extractions`);
    } catch (e) {
      showToast(e.response.data.message, "error");
      console.error(e);
    } finally {
      hideLoading();
    }
  };

  const handleSelectedRowsChange = ({ selectedRows }) => {
    const ids = selectedRows.map((r) => r.id);
    setSelectedIds(ids);
    setSelectedRowId(ids[ids.length - 1] || null);
  };

  const handleViewDataExtractions = async () => {
    navigate(`/projects/${projectId}/extractions`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="card">
        {/* Top Bar */}
        {hasQuery && (
          <div
            style={{
              display: "flex",
              gap: "2rem",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            <div style={{ flex: 10 }}>
              <QueryBox value={hasQuery ? queryValue : ""} />
            </div>
            <div style={{ flex: "1", marginTop: "62px" }}>
              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <Tooltip id="upload" content="Add a New Paper" place="bottom">
                  <IconButton
                    icon={faPlus}
                    onClick={handleOpenInsertRow}
                    style={{
                      backgroundColor: "var(--primary-color)",
                      fontSize: "36px",
                      width: "65px",
                      height: "65px",
                      color: "white",
                      boxShadow: "10px 10px 10px var(--box-shadow)",
                      borderRadius: "24px",
                    }}
                  />
                </Tooltip>

                <Tooltip id="chat" content="AI chat">
                  <IconButton
                    disabled
                    icon="ai-icon"
                    onClick={handleOpenChat}
                    style={{
                      backgroundColor: "var(--primary-color)",
                      fontSize: "36px",
                      width: "65px",
                      height: "65px",
                      color: "white",
                      boxShadow: "10px 10px 10px var(--box-shadow)",
                      borderRadius: "24px",
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Title Row */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: "4", margin: 0 }}>
            <h4>
              <FontAwesomeIcon
                icon={faAngleLeft}
                style={{ marginRight: "0.5rem", cursor: "pointer" }}
                onClick={handleBack}
              />
              List of Downloaded Papers ({results.length})
            </h4>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ margin: 0 }}>
          {selectedRow || showChat ? (
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 3, margin: 0 }} className="card">
                <div className="downloads-table">
                  <DataTableComponent
                    id="downloads-table"
                    data={results}
                    columns={columns}
                    selectableRows
                    clearSelectedRows={toggleCleared}
                    conditionalRowStyles={conditionalRowStyles}
                    onRowClicked={handleRowClick}
                    searchableColumns={searchableColumns}
                    selectableRowDisabled={
                      (row) => isRowExcluded(row)
                    }
                    onSelectedRowsChange={handleSelectedRowsChange}
                  />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {showChat ? (
                  <ChatBox onClose={handleCloseChat} />
                ) : showDetails ? (
                  <DataTableDetails
                    row={selectedRow}
                    onClose={() => {
                      setShowDetails(false);
                      setSelectedRow(null);
                    }}
                    sections={[
                      {
                        title: "Paper Summary",
                        content:
                          selectedRow?.summary ?? "No summary available.",
                      },
                    ]}
                  />
                ) : showViewer ? (
                  <div>
                    <FileViewer
                      pdfUrl={generatedPdfUrl}
                      onClose={handleCloseViewer}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="card" style={{ margin: 0 }}>
              <div className="downloads-table">
                <div>
                  <DataTableComponent
                    selectableRows
                    data={results}
                    columns={columns}
                    clearSelectedRows={toggleCleared}
                    searchableColumns={searchableColumns}
                    conditionalRowStyles={conditionalRowStyles}
                    selectableRowDisabled={
                      (row) => isRowExcluded(row)
                    }
                    onRowClicked={handleRowClick}
                    onSelectedRowsChange={handleSelectedRowsChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="footer" style={{ marginTop: "1rem" }}>
        <Button
          color="secondary"
          variant="outlined"
          disabled={selectedIds.length === 0}
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button variant="outlined" color="primary" onClick={handleBack}>
          Back
        </Button>
        <Button
          disabled={!projectId}
          variant="outlined"
          color="primary"
          onClick={handleViewDataExtractions}
        >
          View Extractions
        </Button>
        <Button
          variant="primary"
          color="primary"
          disabled={selectedIds.length === 0}
          onClick={handleDataExtraction}
        >
          Extract Data
        </Button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column" }}>
        <FileUploaderModal
          size="small"
          open={showUploadModal}
          onSubmit={handleUploadSubmit}
          onCancel={handleUploadCancel}
        />

        <InsertRowModal
          open={showInsertRowModal}
          onSubmit={handleInsertRowSubmit}
          onCancel={() => setShowInsertRowModal(false)}
        />
      </div>
    </div>
  );
}