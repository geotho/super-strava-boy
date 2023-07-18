package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
)

type stravaActivity struct {
	ID int `json:"id"`
}

func main() {
	err := run(context.Background())
	if err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context) error {
	path, err := getPath()
	if err != nil {
		return err
	}

	activities, err := loadActivities(path)
	if err != nil {
		return err
	}

	n := len(activities)

	log.Printf("Loaded %d activities", n)

	var mu sync.Mutex
	var errs error

	var wg sync.WaitGroup
	tokens := make(chan struct{}, 30)

	wg.Add(n)

	for i, activity := range activities {
		i := i
		activity := activity
		tokens <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-tokens }()

			err := func() error {
				log.Printf("Fetching %d (%d/%d)", activity.ID, i+1, n)
				body, err := fetchActivity(activity.ID)
				if err != nil {
					return err
				}

				err = saveToFile(activity.ID, body)
				if err != nil {
					return err
				}

				return nil
			}()

			if err != nil {
				mu.Lock()
				errs = errors.Join(errs, err)
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	log.Printf("Done.")
	if errs != nil {
		log.Printf("Errors:\n%v", errs)
	}

	return nil
}

func getPath() (string, error) {
	// Path is the first and only command line arg.
	if len(os.Args) < 2 {
		return "", fmt.Errorf("path is required")
	}

	if len(os.Args) > 2 {
		return "", fmt.Errorf("only one argument is allowed. Got: %q", os.Args[1:])
	}

	return os.Args[1], nil
}

func loadActivities(path string) ([]stravaActivity, error) {
	fileBytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %q: %v", path, err)
	}

	var activities []stravaActivity

	err = json.Unmarshal(fileBytes, &activities)
	if err != nil {
		return nil, fmt.Errorf("unmarshalling %q: %v", path, err)
	}

	return activities, nil
}

func fetchActivity(id int) ([]byte, error) {
	// "https://nene.strava.com/flyby/stream_compare/" + id + "/" + id

	path := fmt.Sprintf("https://nene.strava.com/flyby/stream_compare/%d/%d", id, id)
	log.Printf("Fetching %q", path)

	resp, err := http.Get(path)
	if err != nil {
		return nil, fmt.Errorf("fetching %q: %v", path, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading body of %q: %v", path, err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetching %q: status=%d body=%s", path, resp.StatusCode, body)
	}

	return body, nil
}

func saveToFile(id int, body []byte) error {
	// Make directory `out` if it doesn't exist:
	err := os.MkdirAll("out", 0755)
	if err != nil {
		return fmt.Errorf("creating out directory: %v", err)
	}

	outpath := fmt.Sprintf("out/%d.json", id)
	return os.WriteFile(outpath, body, 0644)
}
