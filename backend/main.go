package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Request structure matching frontend
type AnalysisRequest struct {
	Image string `json:"image"` // base64 encoded image
}

// Response structure matching frontend expectations
type AnalysisResponse struct {
	Score       int      `json:"score"`
	Composition string   `json:"composition"`
	Lighting    string   `json:"lighting"`
	Subject     string   `json:"subject"`
	Strengths   []string `json:"strengths"`
	Suggestions []string `json:"suggestions"`
}

var bedrockClient *bedrockruntime.Client

func init() {
	// Load AWS configuration
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("us-east-1"))
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	bedrockClient = bedrockruntime.NewFromConfig(cfg)
}

func analyzeImageHandler(c *gin.Context) {
	var analysisReq AnalysisRequest
	if err := c.ShouldBindJSON(&analysisReq); err != nil {
		log.Printf("Error parsing request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate image data
	if analysisReq.Image == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image data is required"})
		return
	}

	// Clean base64 data (remove data:image/jpeg;base64, prefix if present)
	imageData := analysisReq.Image
	if strings.Contains(imageData, ",") {
		parts := strings.Split(imageData, ",")
		if len(parts) > 1 {
			imageData = parts[1]
		}
	}

	// Validate base64 data
	if _, err := base64.StdEncoding.DecodeString(imageData); err != nil {
		log.Printf("Error decoding base64 image: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image data"})
		return
	}

	// Analyze image with Bedrock
	analysis, err := analyzeImageWithBedrock(c.Request.Context(), imageData)
	if err != nil {
		log.Printf("Error analyzing image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze image"})
		return
	}

	// Return analysis
	c.JSON(http.StatusOK, analysis)
}

func analyzeImageWithBedrock(ctx context.Context, imageData string) (*AnalysisResponse, error) {
	// Create the prompt for photography analysis (beginner-friendly)
	prompt := `You are a friendly photography teacher helping someone who is new to film photography (they use a reel camera, not a smartphone).
They’ve shared a photo, and your job is to gently guide them with clear, simple feedback to help them improve.

First, try to understand what the user was trying to capture in the photo (their intent). Was it a mood, a story, a main subject, or just something interesting? Use that to make your advice more helpful.

Respond in the following JSON format:

{
  "score": <number from 1 to 10>,
  "intent": "<one sentence guessing what the photographer might have wanted to show or express>",
  "composition": "<1-2 short, friendly sentences about how the photo is arranged and how it could be clearer or more balanced>",
  "lighting": "<1-2 beginner-friendly sentences about how the light is affecting the photo, and how it could be improved>",
  "subject": "<1-2 sentences about the main subject and how well it stands out>",
  "strengths": ["<something that works well>", "<another good thing you noticed>"],
  "suggestions": [
    "<an easy, practical tip for next time based on their intent>",
    "<another beginner-friendly idea to try>",
    "<one more basic improvement suggestion>"
  ]
}


Keep these guidelines in mind:
Speak like a friendly, supportive coach — be positive and encouraging.

Use very simple language (avoid terms like aperture, ISO, white balance).

Guess their intent kindly, even if it’s not clear — this helps tailor your advice.

Focus suggestions on basic, easy-to-try ideas like:

“Try moving closer to your subject”

“Shoot during golden hour for softer light”

“Keep the background simple to highlight your subject”

They’re learning with a film camera, so keep it practical and low-tech.`

	// Decode base64 image data
	imageBytes, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image data: %w", err)
	}

	// Create user message with image and text
	userMessage := types.Message{
		Role: types.ConversationRoleUser,
		Content: []types.ContentBlock{
			&types.ContentBlockMemberImage{
				Value: types.ImageBlock{
					Format: types.ImageFormatJpeg,
					Source: &types.ImageSourceMemberBytes{
						Value: imageBytes,
					},
				},
			},
			&types.ContentBlockMemberText{
				Value: prompt,
			},
		},
	}

	// Call Bedrock Converse API
	input := &bedrockruntime.ConverseInput{
		ModelId:  aws.String("us.meta.llama4-scout-17b-instruct-v1:0"),
		Messages: []types.Message{userMessage},
		InferenceConfig: &types.InferenceConfiguration{
			MaxTokens:   aws.Int32(2000),  // Reduced from 2000 to 800 for cost savings
			Temperature: aws.Float32(0.7), // Adjusted for more creative responses
			TopP:        aws.Float32(0.9), // Adjusted for more creative
		},
	}

	result, err := bedrockClient.Converse(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to call bedrock converse: %w", err)
	}

	// Extract response text
	if result.Output == nil {
		return nil, fmt.Errorf("no output in bedrock response")
	}

	var responseText string
	if msgResult, ok := result.Output.(*types.ConverseOutputMemberMessage); ok {
		if len(msgResult.Value.Content) > 0 {
			if textBlock, ok := msgResult.Value.Content[0].(*types.ContentBlockMemberText); ok {
				responseText = textBlock.Value
			}
		}
	}

	if responseText == "" {
		return nil, fmt.Errorf("no text content in bedrock response")
	}

	// Find JSON in the response (Claude sometimes adds extra text)
	jsonStart := strings.Index(responseText, "{")
	jsonEnd := strings.LastIndex(responseText, "}") + 1

	if jsonStart == -1 || jsonEnd <= jsonStart {
		return nil, fmt.Errorf("no valid JSON found in response")
	}

	jsonText := responseText[jsonStart:jsonEnd]

	// Parse the analysis JSON
	var analysis AnalysisResponse
	if err := json.Unmarshal([]byte(jsonText), &analysis); err != nil {
		log.Printf("Failed to parse JSON response: %s", jsonText)
		return nil, fmt.Errorf("failed to parse analysis JSON: %w", err)
	}

	// Validate score range
	if analysis.Score < 1 {
		analysis.Score = 1
	} else if analysis.Score > 10 {
		analysis.Score = 10
	}

	return &analysis, nil
}

func main() {
	// Set Gin mode from environment variable
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	// Create Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})

	// Photography analysis endpoint
	r.POST("/analyze", analyzeImageHandler)

	// Get port from environment variable or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
