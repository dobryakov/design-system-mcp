# Как использовать MCP Design System Analyzer в Cursor IDE

## Доступные инструменты (Tools)

1. **`get_tokens`** - Получить дизайн-токены (цвета, шрифты, отступы)
2. **`get_design_system`** - Получить полную дизайн-систему
3. **`get_component`** - Получить конкретный компонент
4. **`get_patterns`** - Получить паттерны компонентов
5. **`list_design_systems`** - Список доступных дизайн-систем

## Примеры использования в Cursor IDE

### Пример 1: Получить цветовую гамму aviasales

В чате Cursor IDE просто напишите:

```
Получи цветовую гамму из дизайн-системы aviasales
```

Или более конкретно:

```
Используй MCP tool get_tokens для получения цветов из aviasales
```

Cursor автоматически вызовет инструмент `get_tokens` с параметром `site_name: "aviasales"` и вернёт вам все цвета.

### Пример 2: Получить все токены (цвета, шрифты, отступы)

```
Покажи мне все дизайн-токены из aviasales
```

### Пример 3: Получить конкретный компонент

```
Получи компонент Button из дизайн-системы aviasales
```

### Пример 4: Получить полную дизайн-систему

```
Покажи мне полную дизайн-систему aviasales
```

### Пример 5: Список доступных дизайн-систем

```
Какие дизайн-системы доступны?
```

## Доступные дизайн-системы

- `aviasales`
- `dobryakov-com`
- `dobryakov-com-test`
- `test-quick`

## Структура данных

### Цвета (Colors)
Цвета возвращаются в формате:
```json
{
  "color-dark-0": {
    "value": "rgb(0, 0, 0)",
    "type": "color"
  },
  "color-3": {
    "value": "rgb(12, 115, 254)",
    "type": "color"
  }
}
```

### Шрифты (Fonts)
```json
{
  "font-family-0": {
    "value": "Times New Roman"
  },
  "font-family-1": {
    "value": "-apple-system"
  }
}
```

### Отступы (Spacing)
```json
{
  "spacing-0": {
    "value": "normal"
  },
  "spacing-1": {
    "value": "320px"
  }
}
```

## Примеры запросов через API (для отладки)

### Получить токены через curl:

```bash
curl -X POST http://localhost:3001/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-1" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_tokens",
      "arguments": {
        "site_name": "aviasales"
      }
    }
  }'
```

### Получить полную дизайн-систему:

```bash
curl -X POST http://localhost:3001/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-1" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_design_system",
      "arguments": {
        "site_name": "aviasales"
      }
    }
  }'
```

## Советы по использованию

1. **Используйте естественный язык** - Cursor понимает запросы на русском и английском
2. **Указывайте название дизайн-системы** - всегда указывайте `site_name` (например, "aviasales")
3. **Будьте конкретны** - если нужны только цвета, так и скажите
4. **Используйте результаты в коде** - Cursor может помочь вам использовать полученные токены в вашем коде

## Пример диалога

**Вы:** Получи цветовую гамму из aviasales

**Cursor:** Используя MCP tool `get_tokens`, получаю цвета из aviasales...

**Результат:**
- color-dark-0: rgb(0, 0, 0)
- color-dark-1: rgb(12, 19, 29)
- color-3: rgb(12, 115, 254) (основной синий)
- color-8: rgb(255, 170, 24) (оранжевый)
- color-10: rgb(250, 116, 45) (оранжевый акцент)
- color-11: rgb(59, 191, 86) (зелёный)
- и т.д.

**Вы:** Используй эти цвета для создания CSS переменных

**Cursor:** Создаст CSS файл с переменными на основе полученных цветов.

