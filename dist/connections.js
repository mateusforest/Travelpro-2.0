(() => {
  'use strict';

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const icon = (ctx, name) => typeof ctx.icon === 'function' ? ctx.icon(name) : '';
  const tag = (label, tone = 'neutral') => `<span class="conn-tag conn-tag-${tone}">${escape(label)}</span>`;

  function render(ctx = {}) {
    const services = Array.isArray(ctx.services) ? ctx.services : [];
    const configured = name => services.some(service => service && (service.service === name || service.id === name) && service.configured === true);
    const configurationTag = name => configured(name) ? tag('Configuração registrada · não verificada', 'review') : tag('Aguardando ativação pela equipe');
    const header = typeof ctx.pageTop === 'function'
      ? ctx.pageTop('Conexões', 'Os serviços que apoiam o trabalho da sua agência.')
      : '<header class="conn-heading"><h1>Conexões</h1><p>Os serviços que apoiam o trabalho da sua agência.</p></header>';

    const included = `<section class="conn-section" aria-labelledby="conn-included-title">
      <div class="conn-section-heading"><h2 id="conn-included-title">Incluído no TravelPro</h2><p>A equipe TravelPro cuida da ativação e do funcionamento.</p></div>
      <div class="conn-included-grid">
        <article class="conn-card">
          <div class="conn-card-heading"><span class="conn-icon" aria-hidden="true">${icon(ctx, 'spark')}</span><h3>COS, seu assistente</h3></div>
          <p>Apoio para organizar atendimentos e preparar rascunhos que você revisa antes de usar.</p>
          ${configurationTag('openai')}
          <p class="conn-detail">${configured('openai') ? 'A configuração está registrada. O funcionamento do serviço ainda precisa ser verificado pela equipe.' : 'A ativação do assistente é feita pela equipe TravelPro.'}</p>
        </article>
        <article class="conn-card">
          <div class="conn-card-heading"><span class="conn-icon" aria-hidden="true">${icon(ctx, 'plane')}</span><h3>Fluxo com operadoras</h3></div>
          <p>Cotações e propostas organizadas no atendimento. Reserva e pagamento continuam no portal da operadora.</p>
          ${configurationTag('operator')}
          <p class="conn-detail">${configured('operator') ? 'Há uma configuração técnica registrada; a conexão com a operadora ainda não foi validada.' : 'A conexão direta com a operadora aguarda ativação e validação pela equipe.'}</p>
        </article>
      </div>
    </section>`;

    const channels = `<section class="conn-section" aria-labelledby="conn-channels-title">
      <div class="conn-section-heading"><h2 id="conn-channels-title">Canais da sua agência</h2><p>Conversas com seus clientes, com a equipe no controle.</p></div>
      <article class="conn-channel-card">
        <div class="conn-channel-main">
          <div class="conn-card-heading"><span class="conn-icon" aria-hidden="true">${icon(ctx, 'mail')}</span><h3>WhatsApp Business</h3></div>
          <p>Centralize o atendimento aos clientes. O COS pode preparar respostas para sua equipe revisar antes de enviar.</p>
          ${configured('whatsapp') ? tag('Configuração registrada · não verificada', 'review') : tag('Ainda não ativado')}
          <p class="conn-detail">${configured('whatsapp') ? 'Recebimento e envio de mensagens dependem da validação do canal pela equipe TravelPro.' : 'A equipe TravelPro orienta a ativação do número de atendimento da agência.'}</p>
        </div>
        <div class="conn-channel-actions"><button class="conn-button" type="button" data-action="connection-whatsapp-setup">${ctx.businessPhone ? 'Número: '+escape(ctx.businessPhone) : 'Preparar meu número'}</button><button class="conn-button" type="button" data-action="connection-whatsapp-info">Como funciona</button><a class="conn-link" href="#whatsapp">Abrir conversas ${icon(ctx, 'arrow')}</a></div>
        <div class="conn-internal-note"><strong>Conversar com o COS pelo WhatsApp</strong><p>Será um canal interno da equipe, separado das conversas com clientes. Está planejado e não é ativado nesta tela.</p></div>
      </article>
    </section>`;

    const planned = `<section class="conn-section" aria-labelledby="conn-planned-title">
      <div class="conn-section-heading"><h2 id="conn-planned-title">Próximas conexões</h2></div>
      <div class="conn-planned-grid">
        <article class="conn-small-card"><div class="conn-small-heading"><h3>Assinatura eletrônica</h3>${tag('Clicksign · integração em preparação')}</div><p>Documentos com signatários, acompanhamento e arquivo final vinculado ao cliente e à viagem.</p><button class="conn-button" data-action="connection-signature-info">Ver preparação</button></article>
        <article class="conn-small-card"><div class="conn-small-heading"><h3>Open Finance</h3>${tag('Pluggy · integração em preparação')}</div><p>Leitura de contas e extratos com autorização do responsável. Preparação para conciliar preservando o histórico do Granatum.</p><button class="conn-button" data-action="connection-openfinance-info">Ver preparação</button></article>
      </div>
    </section>`;

    const admin = ctx.platformAdmin === true ? `<details class="conn-admin"><summary>Administração TravelPro</summary><div class="conn-admin-content"><p>Configuração técnica da plataforma. Registrar credenciais não confirma que o serviço está funcionando.</p><div class="conn-admin-actions">${[['openai','Configurar serviço de IA'],['operator','Configurar adaptador da operadora'],['whatsapp','Configurar WhatsApp Business']].map(([id, label]) => `<button class="conn-admin-button" type="button" data-action="backend-integration" data-id="${id}">${escape(label)}</button>`).join('')}</div></div></details>` : '';
    return `<section class="conn-page">${header}${included}${channels}${planned}${admin}</section>`;
  }

  window.TravelConnections = Object.freeze({render});
})();
