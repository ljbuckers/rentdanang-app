import re

class TextCleaner:
    """Standardize listing text and descriptions."""

    @staticmethod
    def clean_title(title: str) -> str:
        if not title:
            return ""
        
        # Remove common spam prefixes
        # Handles: HOT HOT, URGENT, INBOX ME, caps, etc.
        spam_patterns = [
            r'^(HOT\s*)+', r'^(URGENT\s*)+', r'^(CHO THUÊ\s*)+', r'^(FOR RENT\s*)+', r'^(RENT\s*)+',
            r'^(INBOX\s*)+', r'^(GIÁ RẺ\s*)+', r'^(SIÊU RẺ\s*)+', r'^(CHÍNH CHỦ\s*)+',
            r'^(BEST PRICE\s*)+', r'^(AVAILABLE\s*)+'
        ]
        
        cleaned = title
        for pattern in spam_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
            
        # Remove punctuation/symbols often used for emphasis at start
        cleaned = re.sub(r'^[\s!@#$%^&*()_\-+=|\\\[\]{};:\'",.<>/?]+', '', cleaned)

        # Remove duplicate punctuation
        cleaned = re.sub(r'([!?.])\1+', r'\1', cleaned)
        
        # Normalize whitespace
        cleaned = " ".join(cleaned.split())
        
        # Fix ALL CAPS if length > 10 (convert to Title Case or Sentence case)
        # Check if mostly caps (ignoring numbers/symbols)
        letters = [c for c in cleaned if c.isalpha()]
        if letters and sum(1 for c in letters if c.isupper()) / len(letters) > 0.8:
            cleaned = cleaned.capitalize()
            
        return cleaned.strip()

    @staticmethod
    def clean_description(desc: str) -> str:
        if not desc:
            return ""
            
        lines = desc.split('\n')
        cleaned_lines = []
        
        spam_keywords = [
            r'inbox', r'ib', r'contact', r'liên hệ', r'call me', r'zalo', r'phone', 
            r'whatsapp', r'viber', r'hotline', r'booking', r'tư vấn'
        ]
        spam_regex = re.compile(r'|'.join(spam_keywords), re.IGNORECASE)
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip short lines that look like spam/contact info
            if len(line) < 50 and spam_regex.search(line):
                # If line is JUST contact info, skip. If it has substance, keep?
                # User said "Strip spam from descriptions". Contact info is usually spam in this context.
                # But phone numbers are useful? The user said "Same phone... = duplicate", so we need phone.
                # But description text shouldn't be full of "CALL ME NOW HOT HOT".
                # Let's be conservative: strip lines that start with spam keywords.
                if re.match(r'^(' + r'|'.join(spam_keywords) + r')[:\s]*', line, re.IGNORECASE):
                    continue
            
            # Standardize bullet points
            if re.match(r'^[-*+•]\s+', line):
                line = "• " + line.lstrip("-*+• ")
                
            cleaned_lines.append(line)
            
        return "\n".join(cleaned_lines)
