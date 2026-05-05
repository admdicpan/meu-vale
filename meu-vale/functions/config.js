// functions/config.js
export async function onRequest(context) {
  // Acessa a variável de ambiente definida no painel da Cloudflare
  const apiUrl = context.env.API_URL;

  if (!apiUrl) {
    return new Response(JSON.stringify({ error: 'API_URL não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const config = { apiUrl };
  return new Response(JSON.stringify(config), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // ajuste para o seu domínio se quiser restringir
    }
  });
}