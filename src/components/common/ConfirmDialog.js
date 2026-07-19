import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

export default function ConfirmDialog({
  show,
  title,
  body,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title || t("common.confirm")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel || t("common.confirm")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}