# OCR Improvement Strategies for Receipt Processing

## Current Issues
- Vendor names not properly parsed
- Some receipt data not recognized correctly
- SAM cropping too aggressive (now disabled)

## Recommended Solutions (Ordered by Implementation Complexity)

### 1. **Tesseract Configuration Tuning** (Easiest - No Cost)
**Current approach uses default Tesseract settings. We can optimize:**

```typescript
// Add to receipt-processor.ts or create tesseract-config.ts
const TESSERACT_CONFIG = {
  lang: 'eng',
  oem: 1, // LSTM neural net mode
  psm: 6, // Assume uniform block of text (good for receipts)
  // Character whitelist for receipts (alphanumeric + common symbols)
  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,:/- ',
}
```

**Preprocessing improvements:**
- Adaptive thresholding (already using contrast enhancement)
- Deskewing for tilted receipts
- Noise removal
- Better binarization

### 2. **Multi-Pass OCR with Different PSM Modes** (Medium - No Cost)
Run Tesseract multiple times with different Page Segmentation Modes:
- PSM 3: Fully automatic
- PSM 6: Uniform block
- PSM 11: Sparse text
- PSM 13: Raw line (for vendor names at top)

Merge results intelligently based on confidence scores.

### 3. **Post-OCR Text Correction** (Medium - No Cost)
```typescript
// Vendor name database/fuzzy matching
const KNOWN_VENDORS = ['Walmart', 'Target', 'Costco', 'CVS', ...]

function correctVendorName(ocrText: string): string {
  // Levenshtein distance matching
  // Return closest known vendor
}

// Common OCR mistakes
const OCR_CORRECTIONS = {
  '0': 'O',  // Zero to letter O in vendor names
  '1': 'I',  // One to letter I
  '5': 'S',  // Five to letter S
}
```

### 4. **Vision Language Models (VLM)** - Best Accuracy

#### **A. Local/Open-Source Options (NO API Costs)**

**PaliGemma (Google) - RECOMMENDED**
- Size: 3B parameters (~6GB)
- License: Open source (Gemma license)
- Quality: Excellent for document understanding
- Speed: Fast on modern GPUs, slow on CPU
```bash
npm install @huggingface/transformers
# Use in browser with WebGPU or on server with ONNX
```

**LLaVA (Microsoft/Others)**
- Size: 7B-13B parameters
- License: Fully open source
- Quality: Very good for visual question answering
- Deployment: Browser-based with transformers.js possible but slow

**Moondream2**
- Size: 1.6B parameters (~3GB)
- License: Apache 2.0
- Quality: Good for document tasks
- Speed: Fastest option, can run in browser
- **BEST FOR YOUR USE CASE** - smallest, fastest, browser-compatible

#### **B. Hosted Free Tier Options**

**Hugging Face Inference API**
- Free tier: 30k characters/month
- Models: Florence-2, Qwen-VL, others
- Latency: ~2-3 seconds per image
```typescript
const response = await fetch(
  "https://api-inference.huggingface.co/models/microsoft/Florence-2-large",
  {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    method: "POST",
    body: imageData
  }
)
```

**Replicate (Limited Free)**
- Free tier: $5 credit
- Models: LLaVA, others
- Pay-as-you-go: ~$0.001-0.01 per image

#### **C. Paid API Options (Best Quality)**

**GPT-4o Vision** (OpenAI)
- Cost: ~$0.01 per receipt
- Quality: Excellent
- Speed: 1-2 seconds
- Structured output support

**Claude 3 Haiku Vision** (Anthropic)
- Cost: ~$0.004 per receipt  
- Quality: Very good
- Speed: Fast

**Gemini 1.5 Flash** (Google)
- Cost: ~$0.002 per receipt (cheapest)
- Quality: Very good
- Speed: Very fast
- Free tier: 15 requests/minute

### 5. **Hybrid Approach** (RECOMMENDED)

**Phase 1: Enhanced Tesseract (Free)**
1. Optimized preprocessing
2. Multi-PSM OCR
3. Vendor name correction
4. Confidence-based field validation

**Phase 2: VLM Fallback (Selective)**
- Only use VLM when Tesseract confidence < 70%
- Use local Moondream2 for privacy-sensitive data
- Use Gemini Flash API for best quality (cheapest paid option)

**Phase 3: Smart Caching**
- Cache vendor name corrections
- Learn from user corrections
- Build receipt template database

## Implementation Priority

### Immediate (This Session)
1. ✅ Disable aggressive SAM cropping
2. Optimize Tesseract PSM settings
3. Add vendor name fuzzy matching

### Next Session
4. Implement multi-pass OCR
5. Add confidence scoring UI
6. Integrate Moondream2 or Gemini Flash as optional enhancement

### Future Enhancements
7. User correction feedback loop
8. Receipt template recognition
9. Barcode/QR code extraction for verification

## Code Structure Suggestion

```
src/lib/
  ocr/
    tesseract-enhanced.ts    # Optimized Tesseract configs
    text-correction.ts        # Post-OCR corrections
    vendor-database.ts        # Known vendors + fuzzy match
    vision-model.ts          # Optional VLM integration
    ocr-orchestrator.ts      # Combine all strategies
```

## Cost Analysis (per 1000 receipts)

| Approach | Cost | Quality | Speed |
|----------|------|---------|-------|
| Enhanced Tesseract | $0 | 75% | Fast |
| + Moondream2 (local) | $0 | 85% | Medium |
| + Gemini Flash | $2 | 95% | Fast |
| + GPT-4o Vision | $10 | 98% | Medium |

## Recommendation

Start with **Enhanced Tesseract** (free, immediate improvement), then add **Gemini Flash** as an optional "Enhanced OCR" toggle for difficult receipts. This gives users choice and keeps costs low while providing excellent accuracy when needed.
