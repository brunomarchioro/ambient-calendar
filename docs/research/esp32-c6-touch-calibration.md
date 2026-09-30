# Calibração do touch — Waveshare ESP32-C6-Touch-LCD-1.47(-M)

Pesquisa sobre o painel capacitivo da variante **ESP32-C6-Touch-LCD-1.47-M** (SKU 31201). As variantes com e sem headers usam o mesmo LCD/touch e o mesmo pacote de exemplos.

**Data:** 2026-09-19
**Escopo:** manual e código oficial Waveshare; comparação somente-leitura com o driver atualmente usado pelo firmware.
**Não escopo:** alterar ou gravar firmware.

---

## Conclusão

O AXS5106L deste produto **não tem, nos materiais oficiais, uma calibração interativa por pontos nem coeficientes para salvar**. Sendo um painel capacitivo, ele já entrega coordenadas digitais. O ajuste esperado pela Waveshare é configurar corretamente:

1. o tamanho lógico (`172 × 320` em retrato);
2. a rotação do display;
3. `swap_xy`, `mirror_x` e `mirror_y` do touch para a mesma orientação.

No exemplo ESP-IDF oficial, rotação `0` usa `x_max=172`, `y_max=320`, `swap_xy=false`, `mirror_x=true`, `mirror_y=false`. Não existe no driver oficial uma matriz afim, escala por mínimos/máximos, rotina de calibração, NVS ou outra persistência. Fontes: [manual do produto](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47), [recursos oficiais](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Resources-And-Documents) e [pacote oficial de exemplos](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip).

Para este repositório, portanto, “calibrar” deve primeiro significar **validar cantos/centro e corrigir transformação/orientação**, não criar um fluxo de cinco pontos. Há, porém, um risco anterior à calibração: o componente `mydazy` atualmente integrado foi escrito para outro conjunto **ESP32-S3 + JD9853 284×240**, aplica uma compensação fixa de X e pode regravar o firmware interno do touch com uma imagem para painel customizado. Isso precisa ser resolvido antes de interpretar qualquer erro observado como descalibração.

---

## 1. Hardware e comportamento documentados

A Waveshare identifica o touch como **capacitivo AXS5106L**, ligado por I2C, com `GPIO18=SDA`, `GPIO19=SCL`, `GPIO20=RST` e `GPIO21=INT`. A área lógica do display é **172 × 320**. A página cobre conjuntamente os SKUs 31203 e 31201 (`-M`), cuja diferença apresentada é o header. Fonte: [ESP32-C6-Touch-LCD-1.47 — overview oficial](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47?variant=ESP32-C6-Touch-LCD-1.47-M).

O pacote oficial lê até dois pontos. Para cada ponto, recebe X e Y como valores de 12 bits dos registradores iniciados em `0x01`; o driver apenas copia esses valores para a estrutura `esp_lcd_touch`. Ele não escreve registradores de calibração e nem calcula offsets, ganho, mínimos ou máximos. Fonte: [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), arquivo `ESP-IDF/03_lvgl_example/components/esp_lcd_touch_axs5106/esp_lcd_touch_axs5106.c` (as cópias em `01_factory` e `04_lvgl_image` são equivalentes).

O exemplo Arduino oficial confirma o mesmo modelo: lê os mesmos bytes e só transforma as coordenadas conforme `rotation`; não mede nem persiste coeficientes. Fonte: mesmo [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), arquivo `Arduino/libraries/esp_lcd_touch_axs5106l/esp_lcd_touch_axs5106l.cpp`.

O pacote inclui ainda a ferramenta genérica `Arduino_GFX/examples/TouchCalibration`, mas o próprio cabeçalho dela diz que telas capacitivas não devem precisar de calibração. Ela pertence à biblioteca genérica (inclui vários controladores resistivos) e **não é usada pelos exemplos desta placa**, que chamam diretamente `bsp_touch_init`. Portanto, não deve ser tomada como procedimento oficial para o AXS5106L desta board. Fonte: mesmo [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), arquivos `Arduino/libraries/GFX_Library_for_Arduino/examples/TouchCalibration/TouchCalibration.ino` e `Arduino/examples/04_lvgl_arduino_v8/04_lvgl_arduino_v8.ino`.

---

## 2. Tabela oficial de rotação e transformação

O BSP ESP-IDF recebe a rotação em graus e sempre normaliza a geometria base para `x_max=min(width,height)` e `y_max=max(width,height)`, isto é, **172 × 320** nesta placa. Em seguida configura estas flags:

| Rotação do display | Tamanho lógico do exemplo | `swap_xy` | `mirror_x` | `mirror_y` |
| ---: | --- | :---: | :---: | :---: |
| `0°` | 172 × 320 | não | **sim** | não |
| `90°` | 320 × 172 | **sim** | não | não |
| `180°` | 172 × 320 | não | não | **sim** |
| `270°` | 320 × 172 | **sim** | **sim** | **sim** |

Fonte: [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), `ESP-IDF/03_lvgl_example/components/esp_bsp/bsp_touch.c`.

O display é transformado separadamente, no mesmo exemplo:

| Rotação | Display `swap_xy` | Display `mirror_x` | Display `mirror_y` | gap |
| ---: | :---: | :---: | :---: | --- |
| `0°` | não | não | não | `(34, 0)` |
| `90°` | sim | sim | não | `(0, 34)` |
| `180°` | não | sim | sim | `(34, 0)` |
| `270°` | sim | não | sim | `(0, 34)` |

Essas duas tabelas não são contraditórias: a montagem física faz com que o touch em `0°` precise espelhar X, enquanto o LCD não. Fonte: [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), `ESP-IDF/03_lvgl_example/main/main.c`.

### Diagnóstico rápido pela direção do erro

Ao testar alvos nos quatro cantos e no centro:

- horizontal invertido, vertical correto → alternar `mirror_x`;
- vertical invertido, horizontal correto → alternar `mirror_y`;
- movimento horizontal aparece vertical e vice-versa → alternar `swap_xy` e conferir as dimensões;
- direção correta, mas erro aproximadamente constante → conferir o mapeamento/gap do LCD e qual sistema de coordenadas está sendo comparado;
- centro correto, mas erro cresce rumo às bordas → suspeitar de escala/driver incorreto, não de simples mirror/rotation;
- pontos ficam “presos” numa borda → suspeitar de limite ou clamp incorreto.

Essa lista é inferência geométrica a partir das transformações do BSP, não um procedimento publicado pela Waveshare.

---

## 3. O que persiste — e o que não persiste

Os exemplos Waveshare não criam dados de calibração. As flags e dimensões são constantes compiladas no aplicativo e reaplicadas a cada boot. Não há gravação em NVS/flash, EEPROM ou no AXS5106L para alinhamento de coordenadas. Fonte: [Demo.zip oficial](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip), `bsp_touch.c`, `esp_lcd_touch_axs5106.c` e `main.c`.

Consequência: para a orientação fixa atual, a configuração deve ficar no BSP/código. Persistência só seria necessária se o produto passasse a aceitar rotação escolhida pelo usuário ou uma futura calibração própria por unidade; isso seria funcionalidade do aplicativo, não parte do procedimento oficial.

---

## 4. Estado e riscos do firmware deste repositório

O código de integração atual passa `172 × 320`, deixa `swap_xy=false`, configura `mirror_x=true` e deixa `mirror_y=false`, isto é, **as flags coincidem com a rotação oficial `0°`**: [`ws_touch.c`](../../firmware/esp32-c6/ui/waveshare/ws_touch.c).

Contudo, o componente usado por baixo não é o driver Waveshare:

- declara explicitamente hardware-alvo **ESP32-S3 + JD9853 284×240**;
- fixa `TOUCH_MAX_X=284`, `TOUCH_MAX_Y=240`;
- reescala X de um intervalo presumido `9..272` para `0..283` antes de aplicar clamp e mirror;
- aceita somente um ponto;
- verifica a versão e pode atualizar automaticamente o firmware do AXS5106L com uma imagem descrita como feita para painéis customizados `mydazy`.

Fontes locais: [`axs5106l_touch.c`](../../firmware/esp32-c6/managed_components/mydazy__esp_lcd_touch_axs5106l/axs5106l_touch.c) e [`README.md`](../../firmware/esp32-c6/managed_components/mydazy__esp_lcd_touch_axs5106l/README.md). O comportamento oficial de referência, por contraste, está no [Demo.zip Waveshare](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip).

Isso produz dois riscos materiais:

1. a transformação fixa para 284×240 pode comprimir, saturar ou deslocar coordenadas na placa 172×320;
2. a atualização automática com uma imagem que não é fornecida pela Waveshare pode mudar o comportamento do controlador e dificultar a volta ao estado de fábrica.

Por isso, a coleta de coordenadas deve ser feita **sem permitir upgrade de firmware não oficial**. Antes de calibrar, alinhar o driver à implementação oficial ou desativar com segurança esse fluxo; esta pesquisa não faz essa alteração.

---

## 5. Procedimento recomendado para validar na placa

Este é um procedimento de engenharia derivado das fontes, não uma rotina oficial de calibração:

1. Partir da orientação fixa `0°`, geometria `172 × 320` e flags oficiais `swap=false`, `mirror_x=true`, `mirror_y=false`.
2. Mostrar cinco alvos: quatro cantos com margem pequena e o centro.
3. Registrar para cada toque a coordenada **bruta** lida do AXS5106L e a coordenada final entregue ao LVGL.
4. Verificar primeiro eixo, sentido e rotação usando a seção anterior.
5. Verificar depois alcance: os cantos devem se aproximar de `(0,0)`, `(171,0)`, `(0,319)` e `(171,319)` sem clamp prematuro.
6. Repetir alguns toques para separar erro sistemático de ruído/jitter.
7. Somente se, com o driver oficial equivalente, houver erro sistemático crescente nas bordas, medir mínimos/máximos de várias unidades e então decidir se uma escala por software é realmente necessária.

Uma calibração por dois pontos/min-max ou matriz afim seria uma extensão própria. Se criada, os parâmetros poderiam ser persistidos em NVS, mas as fontes da Waveshare não indicam que isso seja necessário para este painel.

---

## Fontes primárias

| Área | Fonte |
| --- | --- |
| Produto, variantes, resolução, controlador e pinos | [Manual oficial Waveshare](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47?variant=ESP32-C6-Touch-LCD-1.47-M) |
| Link canônico dos exemplos | [Recursos e documentos](https://docs.waveshare.com/ESP32-C6-Touch-LCD-1.47/Resources-And-Documents) |
| BSP, driver AXS5106L, exemplos ESP-IDF/Arduino | [ESP32-C6-Touch-LCD-1.47-Demo.zip](https://files.waveshare.com/wiki/ESP32-C6-Touch-LCD-1.47/ESP32-C6-Touch-LCD-1.47-Demo.zip) |
