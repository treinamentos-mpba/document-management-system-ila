# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória e documentos associados a um identificador de usuário.

## 2. Escopo

### Dentro do escopo

- Enviar um arquivo por requisição.
- Gravar o conteúdo do arquivo localmente em `backend/storage`, usando `multer` com `diskStorage`.
- Criar e manter em memória os metadados necessários para listar e localizar os documentos durante a execução do processo.
- Listar os documentos associados ao usuário da requisição.
- Baixar um documento pelo identificador, desde que esteja associado ao usuário da requisição.
- Apresentar na interface os fluxos de upload, listagem e download, além dos estados de carregamento e erro.
- Manter o endpoint de saúde existente `GET /health`.

### Fora do escopo

- Armazenamento em nuvem, bancos de dados ou provedores externos.
- Persistência dos metadados após reiniciar o processo.
- Autenticação, cadastro de usuários, recuperação de senha ou autorização baseada em credenciais reais.
- Versionamento, edição, compartilhamento, exclusão ou busca avançada de documentos.
- Conversão, pré-visualização, antivírus ou transformação do conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um único arquivo por vez usando `multipart/form-data` e o campo `file`. |
| RF-02 | O sistema rejeita o upload quando o arquivo está ausente ou excede o limite configurado, sem registrar metadados para um upload rejeitado. |
| RF-03 | Para um upload aceito, o sistema gera um identificador único e um nome interno de armazenamento que não depende do nome fornecido pelo cliente. |
| RF-04 | Após salvar o arquivo, o sistema registra os metadados em memória e devolve os metadados públicos do documento. |
| RF-05 | O usuário pode listar somente os documentos associados ao identificador de usuário efetivo da requisição. A lista é ordenada do mais recente para o mais antigo. |
| RF-06 | O usuário pode baixar um documento pelo `id` se ele existir e pertencer ao identificador de usuário efetivo da requisição. O download usa o nome original como nome sugerido do arquivo. |
| RF-07 | Um documento inexistente e um documento pertencente a outro usuário resultam na mesma resposta `404`, sem revelar a existência do documento. |
| RF-08 | A interface permite selecionar e enviar um arquivo, atualizar a lista e iniciar o download de cada documento listado. |
| RF-09 | A interface informa sucesso ou erro de forma compreensível e impede envios duplicados enquanto o upload estiver em andamento. |
| RF-10 | `GET /health` informa que o processo backend está respondendo. |

### Identificação do usuário nesta fase

As rotas de documentos aceitam o cabeçalho `X-User-Id`. Se ele estiver ausente, o servidor usa o identificador `default`. Se estiver presente, o valor deve ser aparado, não vazio e ter no máximo 100 caracteres; caso contrário, a requisição recebe `400 Bad Request`. O frontend envia `X-User-Id: default` nesta fase.

Esse identificador serve apenas para organizar os documentos no protótipo. Como não há autenticação, um cliente pode escolher outro valor; portanto, o cabeçalho não constitui controle de acesso nem isolamento seguro entre usuários.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O conteúdo dos arquivos é gravado exclusivamente no filesystem local da aplicação em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados ficam em memória e são perdidos quando o processo backend é reiniciado. Arquivos já gravados podem permanecer no disco sem metadados correspondentes; a reconciliação desses arquivos não faz parte desta fase. |
| RNF-03 | O diretório de armazenamento e o limite de tamanho são configuráveis por variáveis de ambiente; os valores padrão estão definidos na seção 7. |
| RNF-04 | O nome original do arquivo nunca é usado para construir o caminho de armazenamento. O nome interno é gerado pelo servidor, e o acesso ao disco fica restrito ao diretório configurado. |
| RNF-05 | A API não devolve caminhos locais, detalhes internos, stack traces ou conteúdo de erro não controlado pelo servidor. |
| RNF-06 | O backend usa Node.js, Express e JavaScript CommonJS; os testes usam o runner nativo `node:test`. O frontend usa React, Vite e JavaScript ESM. |
| RNF-07 | A comunicação do frontend usa `fetch` pelo prefixo `/api`; durante o desenvolvimento, o proxy do Vite encaminha essas chamadas para o backend local. |
| RNF-08 | As alterações devem manter funções pequenas, responsabilidades separadas e dependências no sentido definido pela Clean Architecture simples, sem introduzir banco de dados ou abstrações desnecessárias. |

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único gerado pelo servidor, preferencialmente UUID. |
| `originalName` | string | Público | Nome original fornecido pelo cliente, usado para exibição e como nome sugerido no download. |
| `size` | number | Público | Tamanho do arquivo em bytes, como inteiro não negativo. |
| `uploadedAt` | string | Público | Data e hora do upload em ISO 8601, normalizada para UTC. |
| `owner` | string | Público | Identificador de usuário efetivo da requisição, conforme a seção 3. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo dentro do diretório de armazenamento. Nunca é enviado pela API. |

Os metadados são mantidos em uma coleção em memória indexada por `id`. O caminho absoluto não é persistido nem exposto; o repositório resolve o arquivo a partir do diretório configurado e de `storageName`.

### Resposta pública de documento

```json
{
  "id": "2b8a60ca-5df1-4f3d-b201-4da120c4f23d",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-28T12:00:00.000Z",
  "owner": "default"
}
```

`storageName` e qualquer caminho do filesystem são dados internos e não aparecem nesta resposta.

## 6. Contratos de API

As rotas abaixo são os caminhos expostos diretamente pelo backend. O frontend as acessa com o prefixo `/api` configurado no proxy do Vite; por exemplo, `POST /api/upload` é encaminhado para `POST /upload`.

### Cabeçalhos comuns

- `X-User-Id`: opcional; se omitido, usa `default`. Aplicam-se as validações da seção 3.
- As respostas JSON usam `Content-Type: application/json; charset=utf-8`.

### `POST /upload`

- **Objetivo:** armazenar um documento e registrar seus metadados.
- **Entrada:** `multipart/form-data`, com exatamente um arquivo no campo `file`.
- **Limite:** `MAX_FILE_SIZE_BYTES`, com padrão de 10 MiB (`10485760` bytes). Não há lista de tipos de arquivo permitidos nesta fase.
- **Sucesso:** `201 Created`, corpo JSON com o objeto de documento público definido na seção 5.
- **Erros:** `400 Bad Request` para arquivo ausente, campo inválido ou identificador de usuário inválido; `413 Payload Too Large` para arquivo acima do limite; `500 Internal Server Error` para falha inesperada de gravação ou processamento.

### `GET /documents`

- **Objetivo:** listar os documentos do usuário efetivo.
- **Entrada:** sem corpo.
- **Sucesso:** `200 OK`, com os documentos ordenados por `uploadedAt` decrescente:

```json
{
  "documents": [
    {
      "id": "2b8a60ca-5df1-4f3d-b201-4da120c4f23d",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-28T12:00:00.000Z",
      "owner": "default"
    }
  ]
}
```

- **Lista vazia:** `200 OK` com `{"documents": []}`.
- **Erros:** `400 Bad Request` para identificador de usuário inválido; `500 Internal Server Error` para falha inesperada.

### `GET /documents/:id/download`

- **Objetivo:** transmitir os bytes do arquivo associado ao identificador.
- **Entrada:** `id` no caminho; sem corpo.
- **Sucesso:** `200 OK`, conteúdo binário com `Content-Disposition: attachment` e nome original sanitizado. Como o tipo de conteúdo não é mantido nos metadados, usar `application/octet-stream`.
- **Erros:** `400 Bad Request` para identificador de usuário inválido; `404 Not Found` se o documento não existir, não pertencer ao usuário ou se o arquivo local não estiver disponível; `500 Internal Server Error` para falha inesperada de leitura.

### `GET /health`

- **Sucesso:** `200 OK` com `{"status":"ok"}`.

### Formato de erro

Erros da API são JSON e não incluem stack trace:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

Os códigos devem ser estáveis e adequados ao caso, por exemplo `FILE_REQUIRED`, `FILE_TOO_LARGE`, `INVALID_USER_ID`, `DOCUMENT_NOT_FOUND` e `INTERNAL_ERROR`. A mensagem pode ser localizada em português.

## 7. Decisões arquiteturais

### Backend

O backend segue o fluxo `routes -> controllers -> services -> repositories`:

- **Routes:** registram os caminhos e encaminham as requisições para controllers. O middleware de upload configura o `multer` com `diskStorage`, diretório local fixo/configurado, nome interno gerado e limite de tamanho.
- **Controllers:** validam os dados de entrada e os cabeçalhos, invocam os services e traduzem resultados e erros para respostas HTTP.
- **Services:** aplicam as regras de negócio, incluindo associação ao usuário, ordenação e verificação de propriedade no download.
- **Repositories:** mantêm metadados em memória e localizam os arquivos no filesystem. Não dependem de Express ou de detalhes HTTP.

Camadas internas não importam camadas externas. A gravação física é local e não deve ser substituída por provedores externos.

### Frontend

O frontend usa componentes funcionais React e separa interface de acesso à API. Um serviço baseado em `fetch` centraliza as chamadas para `/api`; componentes apresentam upload, lista, download e estados de carregamento/erro. As mensagens visíveis ao usuário são em português.

### Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage`, resolvido a partir da raiz do projeto | Diretório local de arquivos; não deve apontar para armazenamento externo. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo por upload, em bytes. |

O diretório deve existir ou ser criado localmente pelo backend antes de receber uploads. A configuração deve ser validada na inicialização; valores inválidos devem produzir erro claro no log e impedir o início do serviço.

## 8. Critérios de aceite

- Um upload válido retorna `201`, grava um arquivo em `backend/storage` e permite que seus metadados apareçam na listagem do mesmo usuário.
- Upload sem arquivo e upload acima do limite retornam os status definidos e não criam um documento listado.
- Uma listagem retorna somente os documentos do usuário efetivo, em ordem decrescente de data, ou uma lista vazia.
- O dono consegue baixar o conteúdo original; outro usuário e um `id` inexistente recebem resposta indistinguível `404`.
- O nome original é preservado para exibição/download, mas não controla o nome nem o caminho físico de armazenamento.
- A interface permite concluir upload, atualizar a lista e baixar um item, com feedback para estados de sucesso, carregamento e erro.
- Os testes cobrem os contratos de sucesso e os principais erros, sem depender de armazenamento externo.
- `GET /health` continua respondendo `200` com `{"status":"ok"}`.

## 9. Plano de execução

As etapas abaixo descrevem trabalho futuro. Nesta solicitação, somente este documento de especificação é criado; nenhum arquivo de back-end ou front-end é implementado ou executado.

1. Revisar e aprovar os requisitos, os contratos HTTP e as decisões explícitas sobre identidade, limites e perda de metadados após reinício.
2. Preparar a configuração do backend e o repositório local de arquivos e metadados, incluindo o `multer` com `diskStorage` e geração segura de nomes internos.
3. Implementar os serviços e endpoints na ordem arquitetural definida, cobrindo upload, listagem, download, ownership e respostas de erro.
4. Construir a interface React para upload, listagem e download, consumindo a API pelo proxy `/api` e mostrando estados de carregamento e erro.
5. Integrar frontend e backend localmente e validar os fluxos completos e os critérios de aceite, incluindo isolamento lógico por `X-User-Id` e casos de arquivo ausente ou indisponível.
6. Executar os testes automatizados e a compilação do frontend, corrigir falhas dentro do escopo e registrar limitações restantes, especialmente a ausência de autenticação e a perda dos metadados ao reiniciar.