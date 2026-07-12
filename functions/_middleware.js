// Redirection au niveau Cloudflare Pages :
// l'apex (sans www) redirige en 301 vers www.verron-laurent.com, chemin + query préservés.
// Toutes les autres requêtes (www, *.pages.dev) passent normalement.
export const onRequest = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname === 'verron-laurent.com') {
    url.hostname = 'www.verron-laurent.com';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};
