export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initAdminOnStartup } = await import('@/lib/initAdmin');
      // Initialize database, admin, and content pool on startup
      await initAdminOnStartup();
    } catch (error) {
      console.error('Failed to initialize application in instrumentation:', error);
    }
  }
}
