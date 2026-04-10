import PublicSiteHeader from './PublicSiteHeader';

export default function PublicPageFrame({
  children,
  currentPath = '/',
  sectionBasePath = '',
  headerTitle = 'Sistem absensi siswa modern',
  headerSticky = true,
  mainClassName = '',
}) {
  return (
    <div className="public-page">
      <div className="public-page-glow public-page-glow-primary" />
      <div className="public-page-glow public-page-glow-left" />
      <div className="public-page-glow public-page-glow-right" />

      <PublicSiteHeader
        currentPath={currentPath}
        sectionBasePath={sectionBasePath}
        title={headerTitle}
        sticky={headerSticky}
      />

      <main className={['public-shell', mainClassName].join(' ').trim()}>{children}</main>
    </div>
  );
}
