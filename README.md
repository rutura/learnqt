# Learnqt Project

[www.learnqt.guide](https://www.learnqt.guide)

## Adding a New Course

Follow these steps to add a new course to the LearnQt site:

1. **Update `_config.yml`**:
   Add the course URL to the `_config.yml` file. This ensures the course link is accessible globally.

   ```yml
   # Course Links
   newcoursekey: 'https://www.udemy.com/course/your-new-course-url/?couponCode='
   ```

2. **Add the Course to `_data/learning_paths.yml`**:
   Add the course details to the appropriate learning path in `_data/learning_paths.yml`. This ensures the course is displayed in the learning paths section.

   ```yml
   learning_paths:
     - title: "Your Learning Path Title"
       description: "Description of the learning path"
       outcome: "Outcome of the learning path"
       path_id: "your-learning-path-id"
       courses:
         - title: "Your New Course Title"
           subtitle: "Your course subtitle/description"
           tag: "[Latest/Recommended]" # Optional
           url_key: "newcoursekey" # Must match the key from _config.yml
   ```

3. **Update `_data/courses.yml`**:
   If the course needs to appear in the featured courses section, add it to `_data/courses.yml`.

   ```yml
   best_courses_list:
     - title: "Your New Course Title"
       subtitle: "Your course subtitle"
       image: "/assets/courses/image/your_course_thumbnail.png"
       link: "{{ site.newcoursekey }}"
       level: "Beginner/Intermediate/Advanced"
       rating: "4.5"
       reviews: "100"
   ```

4. **Add Course Thumbnail**:
   Save the course thumbnail image in `assets/courses/image`. Name it consistently, e.g., `your_course_thumbnail.png`.

5. **Verify `_pages/coursespromo.md`**:
   The `_pages/coursespromo.md` file dynamically pulls data from `_data/learning_paths.yml`. Ensure the new course is correctly added to the learning path, as the file uses the following loop:

   ```markdown
   {% for path in site.data.learning_paths.learning_paths %}
     {% for course in path.courses %}
       <li class="mb-3">
         <div class="d-flex align-items-start">
           <span style="color: #15ba29;" class="me-2">✓</span>
           <div>
             <strong>{{ course.title }}</strong>
             {% if course.tag %}
             <span class="badge ms-2" style="background-color: #15ba29;">{{ course.tag }}</span>
             {% endif %}
             <br>
             <small class="text-muted">{{ course.subtitle }}</small>
           </div>
         </div>
       </li>
     {% endfor %}
   {% endfor %}
   ```

   No changes are needed in `_pages/coursespromo.md` unless you want to customize the layout.

6. **Test Your Changes**:
   Run the site locally to verify the new course appears correctly on both `/courses/` and `/udemy-discounted-9/`.

   ```bash
   bundle exec jekyll serve
   ```

   Check:
   - http://127.0.0.1:4000/courses/
   - http://127.0.0.1:4000/udemy-discounted-9/

### Notes:
- Ensure all YAML files are properly indented.
- Verify the `url_key` matches the key in `_config.yml`.
- Check that the thumbnail image is correctly placed and referenced.


