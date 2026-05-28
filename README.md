# MedSync | Gestão de Serviços Médicos

MedSync é um sistema SaaS fullstack completo voltado para gestão de atendimentos diários, controle financeiro de repasses médicos por clínica, gestão de convênios e relatórios.

O projeto foi construído utilizando tecnologias modernas de front-end e integrações robustas para back-end (BaaS).

## Tecnologias Utilizadas

- **Front-end**: React 19 + Next.js 14 (App Router)
- **Estilização**: Tailwind CSS v4
- **State Management**: Zustand
- **Validação de Formulários**: React Hook Form + Zod
- **Back-end & Database**: Firebase (Authentication e Firestore)
- **Gráficos e Relatórios**: Recharts e jsPDF (com autotable)
- **Ícones**: Lucide React
- **Hospedagem Recomendada**: Vercel

## Como executar localmente

1. **Clone este repositório**:
   ```bash
   git clone <seu-repositorio>
   cd produtividade
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configuração do Firebase**:
   Crie um arquivo `.env.local` na raiz do projeto e adicione suas credenciais baseando-se no arquivo `.env.example`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="sua-api-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="sender-id"
   NEXT_PUBLIC_FIREBASE_APP_ID="app-id"
   ```

   > **Atenção**: Habilite o "Email/Password" no Firebase Authentication e crie as coleções no Firestore. Para o primeiro acesso Admin, você precisará adicionar manualmente um documento na coleção `users` do Firestore vinculando o UID de autenticação.

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação**:
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Funcionalidades e Permissões

- **Admin**:
  - Acesso a todas as configurações e cadastros base (Locais, Convênios, Procedimentos, Usuários, Médicos).
  - Pode ver todos os lançamentos de todos os médicos de todos os locais.
  - Dashboards gerenciais completos.

- **Médico**:
  - Restrito a lançamentos, dashboard pessoal e exportação de PDF.
  - Pode visualizar apenas seus próprios dados.
  - Pode registrar novos atendimentos e alterar status financeiro para "Recebido".

## Estrutura do Banco de Dados (Firestore)

- `users`: Armazena dados de acesso e a role (ADMIN / MÉDICO).
- `locations`: Locais físicos de atendimento (Hospitais, Clínicas).
- `insurances`: Convênios médicos, vinculados a múltiplos locais.
- `procedures`: Códigos dos procedimentos. Contém o mapeamento de valores por Convênio/Local.
- `doctors`: Perfis do corpo clínico.
- `attendances`: Os lançamentos diários vinculando Médico, Local, Paciente, Convênio e Procedimento.

## Deploy (Vercel)

1. Envie seu código para o GitHub.
2. Acesse a Vercel e importe o projeto.
3. Nas configurações do projeto, inclua todas as variáveis de ambiente que estão no `.env.local`.
4. Faça o deploy e pronto!
