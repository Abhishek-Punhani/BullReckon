import json
import re
import argparse
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field, ValidationError, field_validator
from datetime import datetime


def normalize_time_period(value: float, unit: str) -> str:
    """Convert days/weeks/months to standardized format."""
    # Convert to days
    if unit in ["day", "days"]:
        total_days = value
    elif unit in ["week", "weeks"]:
        total_days = value * 7
    elif unit in ["month", "months"]:
        total_days = value * 30
    elif unit in ["year", "years"]:
        total_days = value * 365
    else:
        return str(value)
    
    # Categorize
    if total_days < 365:
        return "short"
    elif total_days < 1095:
        years = int(total_days / 365)
        return f"{years} years" if years > 1 else "medium"
    else:
        return "long"


# Define Pydantic models with mandatory fields
class RiskTolerance(BaseModel):
    category: str = Field(..., description="Risk category: low/medium/high")
    risk_aversion_lambda: Optional[float] = Field(None, description="Numerical risk aversion score")


class Constraints(BaseModel):
    sector_limits: Dict[str, float] = Field(default_factory=dict, description="Sector-wise allocation limits")
    min_allocation: Optional[float] = Field(None, description="Minimum allocation per asset")
    max_allocation: Optional[float] = Field(None, description="Maximum allocation per asset")
    ESG_exclusions: List[str] = Field(default_factory=list, description="ESG exclusion list")
    no_leverage: Optional[bool] = Field(None, description="Leverage preference")
    max_smallcap: Optional[float] = Field(None, description="Maximum small cap allocation")


class Preferences(BaseModel):
    diversification_priority: Optional[str] = Field(None, description="Diversification strategy: sector/cap/factor")
    rebalancing_frequency: Optional[str] = Field(None, description="Rebalancing frequency: monthly/quarterly/annually")
    automation_mode: Optional[str] = Field(None, description="Automation mode: auto/analyst_approval")


class InvestmentParameters(BaseModel):
    # Mandatory fields (using ...)
    investable_amount: float = Field(..., description="Capital to allocate (mandatory)")
    investment_horizon: Union[str, int] = Field(..., description="Investment timeframe (mandatory)")
    target_return: float = Field(..., description="Target annual return percentage (mandatory)")
    risk_tolerance: RiskTolerance = Field(..., description="Risk tolerance (mandatory)")
    liquidity_needs: str = Field(..., description="Liquidity requirements (mandatory)")
    
    # Optional fields
    constraints: Constraints = Field(default_factory=Constraints, description="Investment constraints (optional)")
    preferences: Preferences = Field(default_factory=Preferences, description="Investment preferences (optional)")
    generic_notes: List[str] = Field(default_factory=list, description="Additional user preferences")
    
    @field_validator('liquidity_needs')
    def validate_liquidity(cls, v):
        valid_options = ['immediate', '3-12 months', 'long']
        if v not in valid_options:
            raise ValueError(f"liquidity_needs must be one of {valid_options}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "investable_amount": 1000000,
                "investment_horizon": "long",
                "target_return": 12.0,
                "risk_tolerance": {
                    "category": "medium",
                    "risk_aversion_lambda": 0.5
                },
                "liquidity_needs": "long",
                "constraints": {
                    "sector_limits": {"IT": 0.25, "Banking": 0.30},
                    "min_allocation": 0.05,
                    "max_allocation": 0.30,
                    "ESG_exclusions": ["tobacco", "gambling"],
                    "no_leverage": True,
                    "max_smallcap": 0.20
                },
                "preferences": {"diversification_priority": "sector",
                    "rebalancing_frequency": "quarterly",
                    "automation_mode": "auto"
                },
                "generic_notes": []
            }
        }


class ExtractionResult(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    extracted_parameters: InvestmentParameters
    missing_fields: List[str]
    completion_status: str
    warnings: List[str] = Field(default_factory=list)


def read_transcript_file(file_path: str) -> str:
    """
    Reads transcript from a TXT file.
    
    Args:
        file_path: Path to the transcript TXT file
        
    Returns:
        Transcript content as string
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
        return transcript
    except FileNotFoundError:
        raise FileNotFoundError(f"Transcript file not found: {file_path}")
    except Exception as e:
        raise Exception(f"Error reading transcript file: {e}")


def extract_investment_parameters(transcript: str) -> Dict[str, Any]:
    """
    Extracts structured investment parameters from a conversation transcript.
    
    Args:
        transcript: Chat transcript between user and advisor
        
    Returns:
        Dictionary containing extracted parameters
    """
    
    extraction = {
        "risk_tolerance": {},
        "constraints": {
            "sector_limits": {},
            "ESG_exclusions": []
        },
        "preferences": {},
        "generic_notes": []
    }
    
    transcript_lower = transcript.lower()
    
    # Extract user statements only (filter out advisor questions)
    user_statements = []
    for line in transcript.split('\n'):
        if line.strip().lower().startswith('user:'):
            user_statements.append(line[5:].strip())
    
    user_text = ' '.join(user_statements).lower()
    
    # Extract investable amount (MANDATORY)
    amount_patterns = [
        r'(?:invest|capital|amount|budget|got|have|set aside).*?(?:is|of|around|approximately)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+)\s*(?:lakh|lakhs|cr|crore|crores|k|thousand|million)?',
        r'(?:rs\.?|inr|₹)\s*([\d,]+)\s*(?:lakh|lakhs|cr|crore|crores|k|thousand|million)?',
        r'([\d,]+)\s*(?:lakh|lakhs|cr|crore|crores|rupees)'
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, user_text)
        if match:
            amount_str = match.group(1).replace(',', '')
            base_amount = float(amount_str)
            
            # Convert to actual numbers based on unit
            context = user_text[max(0, match.start()-50):match.end()+10]
            if 'lakh' in context:
                extraction["investable_amount"] = base_amount * 100000
            elif 'cr' in context or 'crore' in context:
                extraction["investable_amount"] = base_amount * 10000000
            elif 'thousand' in context:
                extraction["investable_amount"] = base_amount * 1000
            elif 'hundred' in context:
                extraction["investable_amount"] = base_amount * 100
            elif 'million' in context:
                extraction["investable_amount"] = base_amount * 1000000
            else:
                extraction["investable_amount"] = base_amount
            break
    
    # Extract investment horizon (MANDATORY)
    horizon_patterns = {
        "short": ["short term", "short-term", "short_term", "1 year", "6 months", "few months"],
        "medium": ["medium term", "medium-term", "medium_term", "2 years", "3 years", "2-3 years"],
        "long": ["long term", "long-term", "long_term", "5 years", "10 years", "5+ years", "retirement", "decade"]
    }
    
    for category, keywords in horizon_patterns.items():
        if any(keyword in user_text for keyword in keywords):
            extraction["investment_horizon"] = category
            break
    
    # Check for time periods with units (handles days/weeks/months/years)
    if "investment_horizon" not in extraction:
        time_period_patterns = [
            r'(?:planning for|invest for|horizon of|period of|around|about|next|for)\s*(\d+)\s*(day|days|week|weeks|month|months|year|years)',
            r'(\d+)\s*(day|days|week|weeks|month|months|year|years).*?(?:horizon|period|timeframe|plan)',
        ]
        
        for pattern in time_period_patterns:
            time_match = re.search(pattern, user_text)
            if time_match:
                value = float(time_match.group(1))
                unit = time_match.group(2)
                # Normalize using the new function
                extraction["investment_horizon"] = normalize_time_period(value, unit)
                break

    # Extract target return (MANDATORY)
    return_patterns = [
        r'(?:return|returns?|expecting|expect|target|looking for|hoping for).*?(\d+(?:\.\d+)?)\s*%',
        r'(?:at least|minimum|min|around)\s*(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?(?:return|returns?)'
    ]

    for pattern in return_patterns:
        return_match = re.search(pattern, user_text)
        if return_match:
            extraction["target_return"] = float(return_match.group(1))
            break
    
    # Extract risk tolerance (MANDATORY) - FROM USER TEXT ONLY
    risk_keywords = {
        "low": ["low risk", "conservative", "risk-averse", "safe", "minimal risk", "very safe", "cautious"],
        "medium": ["moderate risk", "medium risk", "balanced", "moderate", "okay with moderate"],
        "high": ["high risk", "aggressive", "growth", "risk-taking", "very aggressive", "comfortable with high risk", "pretty aggressive"]
    }
    
    for risk_level, keywords in risk_keywords.items():
        if any(keyword in user_text for keyword in keywords):
            extraction["risk_tolerance"]["category"] = risk_level
            break
    
    # Extract risk aversion lambda (optional numerical scale)
    lambda_match = re.search(r'risk.*?(?:level|score|rating|is).*?(\d+(?:\.\d+)?)', user_text)
    if lambda_match:
        extraction["risk_tolerance"]["risk_aversion_lambda"] = float(lambda_match.group(1))
    
    # Extract liquidity needs (MANDATORY) - FROM USER TEXT ONLY
    liquidity_keywords = {
        "3-12 months": [
            "within a few months", "within few months",
            "few months", "6 months", "3 months", "9 months",
            "quarterly access", "short-term access", "within a year", "within the year"
        ],
        "immediate": [
            "immediate", "immediately", "right away", "right now",
            "liquid", "emergency fund", "emergency"
        ],
        "long": [
            "long term", "long-term", 
            "no immediate need", "locked in",
            "don't need soon", "not needed soon", 
            "years away", "several years", "locked for years"
        ]
    }
    
    for liquidity_type, keywords in liquidity_keywords.items():
        if any(keyword in user_text for keyword in keywords):
            extraction["liquidity_needs"] = liquidity_type
            break
    
    # Extract sector limits (OPTIONAL - part of constraints)
    sector_patterns = [
        r'(?:limit|max|maximum|cap|exposure to).*?(it|tech|technology|banking|bank|finance|financial|pharma|pharmaceutical|auto|automobile|fmcg|healthcare|energy).*?(?:to|at|is)?\s*(?:a\s+)?(?:max(?:imum)?\s+of\s+)?(\d+)\s*%',
        r'(it|tech|technology|banking|bank|finance|financial|pharma|pharmaceutical|auto|automobile|fmcg|healthcare|energy).*?(?:limit|max|maximum|cap).*?(\d+)\s*%'
    ]
    
    sector_mapping = {
        "it": "IT", "tech": "IT", "technology": "IT",
        "banking": "Banking", "bank": "Banking", "finance": "Banking", "financial": "Banking",
        "pharma": "Pharma", "pharmaceutical": "Pharma",
        "auto": "Auto", "automobile": "Auto",
        "fmcg": "FMCG",
        "healthcare": "Healthcare",
        "energy": "Energy"
    }
    
    for pattern in sector_patterns:
        sector_matches = re.finditer(pattern, user_text)
        for match in sector_matches:
            sector_key = match.group(1)
            limit_value = match.group(2)
            sector = sector_mapping.get(sector_key, sector_key.upper())
            limit = float(limit_value) / 100
            extraction["constraints"]["sector_limits"][sector] = limit
    
    # Extract allocation constraints (OPTIONAL)
    min_alloc_match = re.search(r'minimum.*?allocation.*?(\d+)\s*%', user_text)
    if min_alloc_match:
        extraction["constraints"]["min_allocation"] = float(min_alloc_match.group(1)) / 100
    
    max_alloc_match = re.search(r'maximum.*?allocation.*?(\d+)\s*%', user_text)
    if max_alloc_match:
        extraction["constraints"]["max_allocation"] = float(max_alloc_match.group(1)) / 100
    
    # Extract smallcap limit (OPTIONAL)
    smallcap_patterns = [
        r'(?:small-cap|small cap|smallcap).*?(?:max|maximum|limit).*?(\d+)\s*%',
        r'(?:max|maximum|limit).*?(\d+)\s*%.*?(?:small-cap|small cap|smallcap)'
    ]
    for pattern in smallcap_patterns:
        smallcap_match = re.search(pattern, user_text)
        if smallcap_match:
            extraction["constraints"]["max_smallcap"] = float(smallcap_match.group(1)) / 100
            break
    
    # Extract ESG exclusions (OPTIONAL)
    esg_keywords = ["tobacco", "alcohol", "gambling", "weapons", "fossil fuel", "coal", "arms", "sin stocks"]
    
    for keyword in esg_keywords:
        patterns = [
            f"no {keyword}", f"avoid {keyword}", f"exclude {keyword}", 
            f"excluding {keyword}", f"not {keyword}", f"don't want {keyword}",
            f"not comfortable with {keyword}", f"please exclude {keyword}"
        ]
        if any(pattern in user_text for pattern in patterns):
            if keyword == "sin stocks":
                # Add common sin stock categories
                extraction["constraints"]["ESG_exclusions"].extend(["tobacco", "gambling", "alcohol"])
            else:
                extraction["constraints"]["ESG_exclusions"].append(keyword)
    
    # Remove duplicates from ESG exclusions
    extraction["constraints"]["ESG_exclusions"] = list(set(extraction["constraints"]["ESG_exclusions"]))
    
    # Extract leverage preference (OPTIONAL)
    if "no leverage" in user_text or "avoid leverage" in user_text or "without leverage" in user_text or "absolutely no leverage" in user_text:
        extraction["constraints"]["no_leverage"] = True
    elif "leverage ok" in user_text or "allow leverage" in user_text or "leverage is fine" in user_text:
        extraction["constraints"]["no_leverage"] = False
    
    # Extract diversification priority (OPTIONAL)
    if "diversify across" in user_text and "market cap" in user_text:
        extraction["preferences"]["diversification_priority"] = "cap"
    elif "sector" in user_text and ("divers" in user_text or "spread" in user_text):
        extraction["preferences"]["diversification_priority"] = "sector"
    elif ("market cap" in user_text or "cap" in user_text) and ("divers" in user_text or "spread" in user_text):
        extraction["preferences"]["diversification_priority"] = "cap"
    elif "factor" in user_text and ("divers" in user_text or "spread" in user_text):
        extraction["preferences"]["diversification_priority"] = "factor"
    
    # Extract rebalancing frequency (OPTIONAL)
    rebalance_keywords = {
        "monthly": ["monthly", "every month", "once a month", "each month"],
        "quarterly": ["quarterly", "every quarter", "once a quarter", "each quarter"],
        "annually": ["annually", "yearly", "once a year", "each year", "annual"]
    }
    
    for freq, keywords in rebalance_keywords.items():
        if any(keyword in user_text for keyword in keywords):
            extraction["preferences"]["rebalancing_frequency"] = freq
            break
    
    # Extract automation mode (OPTIONAL)
    if "require my approval" in user_text or "require approval" in user_text or "manual approval" in user_text or "review any trades" in user_text:
        extraction["preferences"]["automation_mode"] = "analyst_approval"
    elif "automatic" in user_text or ("auto" in user_text and "execution" in user_text):
        extraction["preferences"]["automation_mode"] = "auto"
    
    # Extract generic notes
    for line in user_statements:
        line_stripped = line.strip()
        if len(line_stripped) > 20:
            generic_keywords = ["prefer", "like", "want", "looking for", "interested in", "note", "important", "also", "very important"]
            if any(keyword in line_stripped.lower() for keyword in generic_keywords):
                # Avoid duplicating already extracted information
                if not any(re.search(pattern, line_stripped.lower()) for pattern in amount_patterns):
                    extraction["generic_notes"].append(line_stripped)
    
    return extraction


def identify_missing_mandatory_fields(extraction: Dict[str, Any]) -> List[str]:
    """Identifies missing MANDATORY fields only."""
    missing_fields = []
    
    if "investable_amount" not in extraction or extraction["investable_amount"] is None:
        missing_fields.append("Investable Amount - How much capital do you want to invest? (e.g., 10 lakh rupees)")
    
    if "investment_horizon" not in extraction or extraction["investment_horizon"] is None:
        missing_fields.append("Investment Horizon - What is your investment timeframe? (short/medium/long term or specific years)")
    
    if "target_return" not in extraction or extraction["target_return"] is None:
        missing_fields.append("Target Return - What annual return percentage are you targeting? (e.g., 12%)")
    
    if "risk_tolerance" not in extraction or "category" not in extraction["risk_tolerance"] or extraction["risk_tolerance"]["category"] is None:
        missing_fields.append("Risk Tolerance - What is your risk appetite? (low/medium/high)")
    
    if "liquidity_needs" not in extraction or extraction["liquidity_needs"] is None:
        missing_fields.append("Liquidity Needs - When might you need access to this capital? (immediate/3-12 months/long term)")
    
    return missing_fields


def process_transcript_file(input_file: str, output_file: str = None) -> Dict[str, Any]:
    """
    Main function to process transcript file and save JSON output.
    
    Args:
        input_file: Path to input transcript TXT file
        output_file: Path to output JSON file (default: investment_parameters.json)
        
    Returns:
        Dictionary containing extraction result
    """
    
    if output_file is None:
        output_file = "investment_parameters.json"
    
    try:
        # Read transcript from file
        print(f"📖 Reading transcript from: {input_file}")
        transcript = read_transcript_file(input_file)
        print(f"✅ Transcript loaded successfully ({len(transcript)} characters)\n")
        
        # Extract parameters
        print("🔍 Extracting investment parameters...")
        extraction = extract_investment_parameters(transcript)
        
        # Check for missing mandatory fields
        missing = identify_missing_mandatory_fields(extraction)
        
        if missing:
            print("\n⚠️  Missing mandatory fields:")
            for i, field in enumerate(missing, 1):
                print(f"   {i}. {field}")
            
            print("\n❌ Cannot create investment parameters - missing mandatory fields.")
            print("Please update the transcript with the missing information and try again.\n")
            
            # Save partial extraction for reference
            error_output = {
                "status": "incomplete",
                "missing_mandatory_fields": missing,
                "partial_extraction": extraction,
                "timestamp": datetime.now().isoformat()
            }
            
            error_file = output_file.replace('.json', '_incomplete.json')
            with open(error_file, 'w', encoding='utf-8') as f:
                json.dump(error_output, f, indent=2, ensure_ascii=False)
            
            print(f"📄 Partial extraction saved to: {error_file}")
            return error_output

# Create Pydantic model and validate
        print("✅ All mandatory fields present. Validating...")
        params = InvestmentParameters(**extraction)
        
        # Create result
        result = ExtractionResult(
            extracted_parameters=params,
            missing_fields=[],
            completion_status="complete"
        )
        
        # Save to JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, indent=2, ensure_ascii=False)
        
        print(f"✅ Investment parameters successfully saved to: {output_file}\n")
        
        # Print summary
        print("📊 Extraction Summary:")
        print(f"   • Investable Amount: ₹{params.investable_amount:,.2f}")
        print(f"   • Investment Horizon: {params.investment_horizon}")
        print(f"   • Target Return: {params.target_return}%")
        print(f"   • Risk Tolerance: {params.risk_tolerance.category}")
        if params.risk_tolerance.risk_aversion_lambda:
            print(f"   • Risk Score: {params.risk_tolerance.risk_aversion_lambda}")
        print(f"   • Liquidity Needs: {params.liquidity_needs}")
        
        if params.constraints.sector_limits:
            print(f"   • Sector Limits: {len(params.constraints.sector_limits)} defined")
            for sector, limit in params.constraints.sector_limits.items():
                print(f"     - {sector}: {limit*100}%")
        
        if params.constraints.ESG_exclusions:
            print(f"   • ESG Exclusions: {', '.join(params.constraints.ESG_exclusions)}")
        
        if params.constraints.max_smallcap:
            print(f"   • Max Small Cap: {params.constraints.max_smallcap*100}%")
        
        if params.constraints.no_leverage is not None:
            print(f"   • Leverage: {'Not Allowed' if params.constraints.no_leverage else 'Allowed'}")
        
        if params.preferences.diversification_priority:
            print(f"   • Diversification: {params.preferences.diversification_priority}")
        
        if params.preferences.rebalancing_frequency:
            print(f"   • Rebalancing: {params.preferences.rebalancing_frequency}")
        
        if params.preferences.automation_mode:
            print(f"   • Automation: {params.preferences.automation_mode}")
        
        return result.model_dump()
        
    except ValidationError as e:
        print(f"\n❌ Validation Error: {e}")
        return {"error": str(e), "status": "validation_failed"}
    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        return {"error": str(e), "status": "file_not_found"}
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return {"error": str(e), "status": "error"}


def main():
    """Main entry point with command-line interface."""
    parser = argparse.ArgumentParser(
        description='Extract investment parameters from conversation transcript',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python script.py transcript.txt
  python script.py transcript.txt -o output.json
  python script.py conversation.txt --output investment_data.json
  
Supported time periods: days, weeks, months, years
  Example: "I want to invest for 6 months"
  Example: "Planning for 90 days"
        """
    )
    
    parser.add_argument(
        'input_file',
        type=str,
        help='Path to the transcript TXT file containing User and Advisor conversation'
    )
    
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='investment_parameters.json',
        help='Path to the output JSON file (default: investment_parameters.json)'
    )
    
    args = parser.parse_args()
    
    # Process the transcript
    result = process_transcript_file(args.input_file, args.output)
    
    return result


if __name__ == "__main__":
    main()