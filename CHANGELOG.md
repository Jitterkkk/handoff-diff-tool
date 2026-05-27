# Changelog

## [0.2.0] — 2026-05-27

### Adicionado

- **Design Review Flow**: designer publica as mudanças de um frame como um review; o dev revisa item a item, marcando o que já implementou — sem reunião, sem pergunta
- **Badges visuais nos frames**: círculo colorido (vermelho/amarelo/verde) no canto superior direito de cada frame indica o status do review em tempo real
- **Notificação automática**: ao selecionar um frame com review pendente ou em andamento, um banner aparece na UI com link direto para o detalhe
- **Histórico de até 5 versões por frame**: comprimidas com LZString para caber no `clientStorage` do Figma
- **Suporte a múltiplos frames simultâneos**: baseline e relatório gerados para todos os frames selecionados de uma vez
- **Exportação em JSON**: relatório completo de diffs para integrar em outros processos
- **Relatório HTML visual com screenshots**: antes/depois por frame + screenshots individuais dos nodes alterados
- **Auto Layout no diff engine**: detecta mudanças de layoutMode, itemSpacing, padding e primaryAxisAlignItems

---

## [0.1.0] — versão inicial

### Adicionado

- **Snapshot engine** com compressão LZString e limite de 900 KB por frame
- **Diff engine** com 8 tipos de mudança: COLOR, SIZE, TYPOGRAPHY, CONTENT, ADDED, REMOVED, COMPONENT, LAYOUT
- **Highlight visual** nos nodes alterados: retângulo temporário vermelho sobre o elemento no canvas
