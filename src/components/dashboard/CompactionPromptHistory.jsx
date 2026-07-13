import React, { useEffect, useRef, useState } from 'react';
import ImageLightbox from '../common/ImageLightbox';
import { apiUrl } from '../../utils/apiUrl';
import { findUserImageRefs } from '../../utils/userImageRefs';
import { describeRemoteImage } from '../../utils/remoteImageDisclosure';
import { t } from '../../i18n';
import styles from './CachePopoverContent.module.css';

function promptImageSrc(image) {
  if (image?.sourceType === 'file') {
    return apiUrl(`/api/file-raw?path=${encodeURIComponent(image.source)}`);
  }
  if (image?.sourceType === 'data' || image?.sourceType === 'remote') return image.source;
  return null;
}

const PROMPT_BATCH_SIZE = 20;

function PromptImage({ image }) {
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [remoteAllowed, setRemoteAllowed] = useState(false);
  const imageButtonRef = useRef(null);
  const failureRef = useRef(null);
  const restoreRemoteFocusRef = useRef(false);
  const sourceType = image?.sourceType;
  const src = promptImageSrc(image);
  const rawAlt = typeof image?.alt === 'string' ? image.alt.trim() : '';
  const genericAlt = !rawAlt || (rawAlt.toLowerCase() === 'user image'
    && (sourceType === 'data' || sourceType === 'remote'));
  const alt = genericAlt ? t('ui.contextCompactionImageAlt') : rawAlt;
  const remote = sourceType === 'remote' ? describeRemoteImage(image?.source) : null;
  useEffect(() => {
    if (remoteAllowed && restoreRemoteFocusRef.current) imageButtonRef.current?.focus();
  }, [remoteAllowed]);
  useEffect(() => {
    if (failed && restoreRemoteFocusRef.current) failureRef.current?.focus();
  }, [failed]);
  if (sourceType === 'unavailable') {
    const statusKey = image?.unavailableReason === 'inline_image_too_large'
      ? 'ui.contextCompactionImageOversize'
      : 'ui.contextCompactionImageUnavailable';
    return <span className={styles.compactionPromptImageFallback}>{t(statusKey)}</span>;
  }
  if (!src || (sourceType === 'remote' && !remote)) {
    return <span className={styles.compactionPromptImageFallback}>{t('ui.contextCompactionImageUnavailable')}</span>;
  }
  if (failed) {
    return (
      <span ref={failureRef} role="status" tabIndex={-1} className={styles.compactionPromptImageFallback}>
        {t('ui.contextCompactionImageLoadFailed', { name: alt })}
      </span>
    );
  }
  if (sourceType === 'remote' && !remoteAllowed) {
    const remoteName = remote.name || alt;
    return (
      <button
        type="button"
        className={styles.compactionPromptRemoteButton}
        onClick={() => {
          restoreRemoteFocusRef.current = true;
          setRemoteAllowed(true);
        }}
      >
        <span>{t('ui.contextCompactionLoadRemoteImage', { origin: remote.origin, name: remoteName })}</span>
        {remote.privateNetwork && (
          <span className={styles.compactionPromptPrivateWarning}>
            {t('ui.contextCompactionRemoteImagePrivateWarning')}
          </span>
        )}
      </button>
    );
  }
  return (
    <>
      <button
        ref={imageButtonRef}
        type="button"
        className={styles.compactionPromptImageButton}
        onClick={() => setLightboxOpen(true)}
        aria-label={alt}
      >
        <img
          src={src}
          alt={alt}
          className={styles.compactionPromptImage}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </button>
      {lightboxOpen && <ImageLightbox src={src} alt={alt} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}

function PromptText({ text, segmentKey }) {
  const refs = findUserImageRefs(text);
  if (refs.length === 0) return <div className={styles.compactionPromptText} dir="auto">{text}</div>;
  const parts = [];
  let lastIndex = 0;
  for (const ref of refs) {
    if (ref.index > lastIndex) parts.push(<span key={`${segmentKey}-text-${lastIndex}`}>{text.slice(lastIndex, ref.index)}</span>);
    parts.push(
      <PromptImage
        key={`${segmentKey}-image-${ref.index}`}
        image={{ type: 'image', sourceType: 'file', source: ref.path, alt: ref.path.split('/').pop() }}
      />,
    );
    lastIndex = ref.index + ref.raw.length;
  }
  if (lastIndex < text.length) parts.push(<span key={`${segmentKey}-text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  return <div className={styles.compactionPromptText} dir="auto">{parts}</div>;
}

export default function CompactionPromptHistory({ prompts = [], id, recordKey = null, inDrawer = false }) {
  const safePrompts = Array.isArray(prompts) ? prompts : [];
  const [visibleCount, setVisibleCount] = useState(PROMPT_BATCH_SIZE);
  useEffect(() => setVisibleCount(PROMPT_BATCH_SIZE), [recordKey]);

  if (safePrompts.length === 0) {
    return <div id={id} className={styles.compactionPromptEmpty}>{t('ui.contextCompactionNoPrompts')}</div>;
  }
  const visiblePrompts = safePrompts.slice(0, visibleCount);
  const remaining = Math.max(0, safePrompts.length - visiblePrompts.length);
  return (
    <div id={id} className={styles.compactionPromptRegion} dir="auto">
      <ol
        className={`${styles.compactionPromptList}${inDrawer ? ` ${styles.compactionPromptListInDrawer}` : ''}`}
        aria-label={t('ui.contextCompactionPromptHistoryLabel')}
        tabIndex={inDrawer ? undefined : 0}
      >
        {visiblePrompts.map((prompt, promptIndex) => (
          <li key={`${prompt.id || 'prompt'}-${promptIndex}`} className={styles.compactionPromptItem}>
            {(prompt.segments || []).map((segment, segmentIndex) => {
              const key = `${prompt.id || promptIndex}-${segmentIndex}`;
              if (segment.type === 'text') return <PromptText key={key} text={segment.text} segmentKey={key} />;
              if (segment.type === 'image') return <PromptImage key={key} image={segment} />;
              return null;
            })}
          </li>
        ))}
      </ol>
      {remaining > 0 && (
        <button
          type="button"
          className={styles.compactionPromptLoadMore}
          onClick={() => setVisibleCount(count => Math.min(safePrompts.length, count + PROMPT_BATCH_SIZE))}
        >
          {t('ui.contextCompactionLoadMorePrompts', { count: remaining })}
        </button>
      )}
    </div>
  );
}
