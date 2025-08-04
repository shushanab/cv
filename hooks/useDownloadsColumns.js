import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfo,
  faXmark,
  faArrowUp,
  faFilePdf,
  faSpinner,
  faArrowDown,
  faCircleNotch,
  faCheckCircle,
  faTimesCircle,
  faHourglassStart,
  faArrowUpFromBracket,
} from "@fortawesome/free-solid-svg-icons";

import { MAX_VISIBLE_AUTHORS, PDF_STATUS, EXCLUSION_REASONS } from "../constants";

import Tooltip from "../components/Base/Tooltip";
import ExclusionReasonsPopup from "../components/Base/DataTable/ExclusionReasonsPopup";
import RelevanceScorePopup from "../components/Base/DataTable/RelevanceScorePopup";
import AuthorCell from "../components/Base/DataTable/AuthorCell";
import ImgFromUrl from "../components/DataTable/ImgFromUrl";
import ChipGroup from "../components/Base/Chips/ChipGroup";
import Badge from "../components/Base/Badge/Badge";

const styles = {
  text: {
    padding: "6px 0",
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  date: {
    display: "block",
    width: "100%",
    textAlign: "center",
    cursor: "pointer",
  },
};

/**
 * Build the column config for react‑data‑table‑component for Downloads page.
 */
export default function useDownloadsColumns({
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
}) {
  return useMemo(() => {
    const { PDF_CREATED, PDF_IN_QUEUE, PDF_PROCESSING, PDF_SUCCESS, PDF_FAILED } = PDF_STATUS;

    const STATUS_LABELS = {
      [PDF_CREATED]: "Created",
      [PDF_IN_QUEUE]: "In Queue",
      [PDF_PROCESSING]: "Processing",
      [PDF_SUCCESS]: "Downloaded",
      [PDF_FAILED]: "Failed",
    };

    const STATUS_ICONS = {
      [PDF_CREATED]: faHourglassStart,
      [PDF_IN_QUEUE]: faSpinner,
      [PDF_PROCESSING]: faCircleNotch,
      [PDF_SUCCESS]: faCheckCircle,
      [PDF_FAILED]: faTimesCircle,
    };

    /* ─ header elements ─ */
    const exclusionHeader = (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        Exclusion Reasons
        <Tooltip content="What are Exclusion Reasons?" id="exclusion-info">
          <FontAwesomeIcon
            icon={!showExclusionPopup ? faInfo : faXmark}
            ref={exclusionInfoRef}
            style={{
              color: "var(--error-color)",
              cursor: "pointer",
              fontStyle: "italic",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowExclusionPopup((open) => !open);
            }}
          />
        </Tooltip>
        {showExclusionPopup && (
          <ExclusionReasonsPopup
            anchorRef={exclusionInfoRef}
            popupRef={exclusionPopupRef}
            reasons={EXCLUSION_REASONS}
          />
        )}
      </div>
    );

    const relevanceHeader = (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        UPDATED RELEVANCE SCORE(%)
        <Tooltip content="What is Updated Relevance Score?" id="urs-info">
          <FontAwesomeIcon
            icon={!showInfoPopup ? faInfo : faXmark}
            ref={infoRef}
            style={{ cursor: "pointer", color: "var(--error-color)" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoPopup((open) => !open);
            }}
          />
        </Tooltip>
        {showInfoPopup && (
          <RelevanceScorePopup anchorRef={infoRef} popupRef={popupRef} />
        )}
      </div>
    );

    /* ─ full column list ─ */
    return [
      {
        name: "ID",
        maxWidth: "110px",
        key: "id",
        selector: (r) => r.pmid,
        sortable: true,
        wrap: true,
        cell: (r) => <strong>{r.pmid ?? r.id}</strong>,
      },
      {
        key: "title",
        name: "PAPER NAME",
        selector: (row) => row.title,
        cell: (row) => (
          <span onClick={() => handleRowClick(row)} style={styles.text}>
            {row.title}
          </span>
        ),
        sortable: true,
      },
      {
        key: "doi",
        name: "DOI",
        selector: (row) => row.doi,
        cell: (row) => <span style={styles.text}>{row.doi}</span>,
        sortable: true,
      },
      {
        name: "AUTHORS",
        key: "author",
        selector: (row) => row.authors,
        sortable: true,
        cell: (row) => (
          <AuthorCell
            authors={row.authors}
            key={row.id}
            row={row}
            maxVisibleAuthors={MAX_VISIBLE_AUTHORS}
            isExpanded={!!expandedRows[row.id]}
            toggleRowExpanded={toggleRowExpanded}
            handleRowClick={handleRowClick}
          />
        ),
      },
      {
        name: "PUBLICATION DATE",
        key: "publicationDate",
        selector: (row) => row.publication_date,
        sortable: true,
        cell: (row) => {
          const formatted = row.publication_date
            ? row.publication_date?.slice(0, 10)
            : "";

          return (
            <span style={styles.date} onClick={() => handleRowClick(row)}>
              {formatted}
            </span>
          );
        },
      },
      {
        name: "JOURNAL",
        key: "journal",
        selector: (row) => row.journal,
        sortable: true,
        cell: (row) => (
          <span onClick={() => handleRowClick(row)} style={styles.text}>
            {row.journal}
          </span>
        ),
      },
      {
        name: "DATABASE",
        selector: (row) => row.full_text_url,
        cell: (row) => <ImgFromUrl url={row.full_text_url} />,
        sortable: true,
      },
      /* ----- Exclusion column ----- */
      {
        name: exclusionHeader,
        key: "include",
        minWidth: "200px",
        selector: (row) => row.include,
        sortable: true,
        cell: (row) => (
          <ChipGroup
            items={EXCLUSION_REASONS}
            suggestedCodes={["E1", "E2", "E8"]}
            value={exclusionMap[row.id] ?? null}
            disabled={isRowSelected(row)}
            onChange={(code) => handleExclusionChange(row.id, code)}
          />
        ),
      },
      /* ----- Updated Relevance Score column ----- */
      {
        name: relevanceHeader,
        selector: (row) => row,
        sortable: true,
        cell: (row) => {
          const downloaded = row.pdf_links.find(
            (l) => l.downloadable && typeof l.relevance_score === "number"
          );
          if (!downloaded || row.score?.relevance_score == null) return null;
          
          const previous_rel_score = row.score.relevance_score;
          const updated_rel_score = downloaded.relevance_score;
          const diff = updated_rel_score - previous_rel_score;
          const narrative = downloaded.narrative;
          const isPositive = diff > 0;

          return (
            <Tooltip
              id={`urs-tooltip-${row.id}`}
              content={narrative ?? "No narrative available."}
              placement="top"
              delay={200}
            >
              <div
                onClick={() => handleRowClick(row)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "help",
                }}
              >
                <Badge
                  color={isPositive ? "success" : "error"}
                  value={downloaded.relevance_score ?? "N/A"}
                />

                <div style={{ display: "inline-flex", alignItems: "center" }}>
                  {diff !== 0 && (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={isPositive ? faArrowUp : faArrowDown}
                        style={{
                          color: isPositive
                            ? "var(--success-color)"
                            : "var(--error-color)",
                        }}
                      />
                      <span
                        style={{
                          color: isPositive
                            ? "var(--success-color)"
                            : "var(--error-color)",
                          fontSize: 12,
                          marginLeft: 4,
                        }}
                      >
                        {Math.abs(diff)}%
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </Tooltip>
          );
        },
      },
      /* ----- Download Source column ----- */
      {
        name: <div style={{ display: "flex" }}>Download Source(%)</div>,
        key: "availability",
        selector: (row) => row.pdf_links,
        sortable: true,
        cell: (row) => {
          const downloadable =
            row.pdf_links?.filter((pdf) => pdf.downloadable) || [];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {downloadable.length > 0 &&
                downloadable.map((pdf, idx) => (
                  <a
                    key={pdf.id ?? idx}
                    href={pdf.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--success-color)",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {pdf.journal || "Unknown Journal"}
                  </a>
                ))}
            </div>
          );
        },
      },
      /* ----- Status column ----- */
      {
        name: "STATUS",
        key: "status",
        selector: (row) => {
          const statuses = row.pdf_links?.map((l) => l.status) || [];
          return statuses.length ? Math.max(...statuses) : null;
        },
        sortable: true,
        cell: (row) => {
          const statuses = row.pdf_links?.map((l) => l.status) || [];
          if (statuses.length === 0) {
            return (
              <span
                style={{
                  color: getStatusColor("Not Available"),
                  textAlign: "center",
                }}
              >
                Not Available
              </span>
            );
          }

          // pick the highest‐numbered status (PDF_CREATED=10 → PDF_FAILED=40)
          const code = Math.max(...statuses);

          let label = STATUS_LABELS[code] || "Unknown";
          // if success and the successful link was a manual upload, override label
          if (code === PDF_SUCCESS) {
            const successLink = row.pdf_links.find(
              (l) => l.status === PDF_SUCCESS
            );
            if (successLink?.journal === "Manual Upload") {
              label = "Uploaded";
            }
          }
          const icon = STATUS_ICONS[code];
          const color = getStatusColor(label);

          // Define isDownloaded based on status code
          const isDownloaded = code === PDF_SUCCESS;

          return (
            <span
              onClick={() => handleRowClick(row)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                color,
                cursor: "pointer",
              }}
            >
              {icon && (
                <FontAwesomeIcon
                  icon={icon}
                  spin={
                    !isDownloaded &&
                    (icon === faSpinner || icon === faCircleNotch)
                  }
                />
              )}
              {label}
            </span>
          );
        },
      },
      /* ----- Include column (Actions) ----- */
      {
        name: "Include",
        cell: (row) => {
          const isDownloaded = row.status === "Downloaded";
          const links = Array.isArray(row.pdf_links) ? row.pdf_links : [];

          // enable preview if at least one link has a `path`
          const anyHasPath = links.some((l) => Boolean(l.path));

          return (
            <div style={{ width: "100%", textAlign: "right" }}>
              {/* Upload icon */}
              <FontAwesomeIcon
                disabled={isDownloaded}
                icon={faArrowUpFromBracket}
                style={{
                  cursor: !isDownloaded ? "pointer" : "not-allowed",
                  color: isDownloaded
                    ? "var(--box-shadow)"
                    : "var(--text-color-light)",
                  fontSize: "20px",
                  marginRight: "16px",
                }}
                onClick={() => !isDownloaded && handleOpenUpload(row)}
              />

              {/* Preview PDF icon */}
              <FontAwesomeIcon
                icon={faFilePdf}
                style={{
                  cursor: anyHasPath ? "pointer" : "not-allowed",
                  color: anyHasPath
                    ? "var(--text-color-light)"
                    : "var(--box-shadow)",
                  fontSize: "20px",
                }}
                onClick={(e) => {
                  if (anyHasPath) {
                    e.stopPropagation();
                    const foundLink = links.find((l) => l.path);
                    if (foundLink) {
                      const { path } = foundLink;
                      handleOpenViewer(row, path);
                    }
                  }
                }}
              />
            </div>
          );
        },
      },
    ];
  }, [
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
  ]);
}