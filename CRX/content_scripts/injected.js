import ReactUtils from "./ReactUtils.js"
import DuolingoSkill from "./DuolingoSkill.js"
import DuolingoChallenge from "./DuolingoChallenge.js"

const DEBUG = true;

window.ru = new ReactUtils();

// autocomplete is OFF by default - only turned on when overlay button is clicked
window.autolingo_autocomplete = false;

// append an iframe so we can re-enable console.log
// using its window.log
const frame = document.createElement('iframe');
frame.style.display = "none";
document.body.appendChild(frame);

// if DEBUG, re-enable console.log as window.log
const welcome_message = "Welcome to Autolingo!";
if (DEBUG) {
    window.log = frame.contentWindow.console.log
} else {
    window.log = () => {}
}

// print our welcome message regardless
window.log(welcome_message);

// if the user changes the language, re-inject
let previous_language = null;
let previous_url = null;
setInterval(() => {
    // get the current language from the page
    const page_data = window.ru.ReactFiber(document.querySelector("._3BJQ_"))?.return?.stateNode?.props;
    const current_language = page_data?.courses?.find(e => { return e.isCurrent; })?.learningLanguageId;

    // get current url
    const current_url = document.location.href;

    // DEBUG INFO
    // window.log("language watch", previous_language, current_language);
    // window.log("url watch", previous_url, current_url);

    // if the language changed, we know we just loaded the home page
    if (previous_language !== current_language || previous_url !== current_url) {
        // Reset autocomplete flag whenever URL changes (lesson ended or new lesson started normally)
        if (current_url.includes('/learn') || !current_url.includes('/lesson')) {
            window.autolingo_autocomplete = false;
        }
        inject_autolingo();
        previous_language = current_language;
        previous_url = current_url;
    }
}, 100);

let stylesheet_loaded = false;
let the_extension_id = null;
// inject stylesheet, buttons, etc.
const inject = (extension_id) => {
    the_extension_id = extension_id;
    // inject stylesheet
    let stylesheet = document.createElement("LINK");
    stylesheet.setAttribute("rel", "stylesheet")
    stylesheet.setAttribute("type", "text/css")
    stylesheet.setAttribute("href", `${the_extension_id}/content_scripts/main.css`)
    document.body.appendChild(stylesheet)
    stylesheet.onload = () => {
        stylesheet_loaded = true;
    }

    // solve the current challenge when the user clicks
    // the corresponding button in the popup
    document.addEventListener("solve_challenge", () => {
        const challenge = new DuolingoChallenge();
        challenge.solve().then(() => {
            // challenge.click_next();
            // challenge.click_next();
            window.autolingo.solving = false;
        }).catch(error => {
            console.error(error);
        });
    });

    // solve the challenge and go to the next challenge
    // when the user clicks the corresponding button in the popup
    document.addEventListener("solve_skip_challenge", () => {
        const challenge = new DuolingoChallenge();
        challenge.solve().then(() => {
            challenge.click_next();
            // challenge.click_next();
            window.autolingo.solving = false;
        }).catch(error => {
            console.error(error);
        });
    });
}

const inject_autolingo = () => {
    // window.log(stylesheet_loaded, the_extension_id);
    const i = setInterval(() => {
        if (stylesheet_loaded && the_extension_id) {
            clearInterval(i);

            const tier_img_url = `${the_extension_id}/images/diamond-league.png`;
            const legendary_img_url = `${the_extension_id}/images/legendary.svg`;

            set_hotkeys();

            function processSkillNode(skillNode) {
                const skillNodes = [...skillNode?.querySelector("div")?.children || []];
                
                skillNodes.forEach(skill_node => {
                    const skill_metadata = window.ru.ReactFiber(skill_node)?.child?.memoizedProps?.level;
                    if (!skill_metadata) return;

                    const unlocked = skill_metadata.state !== "locked";
                    const legendary_level_unlocked = skill_metadata.state === "passed";
                    if (unlocked && skill_metadata.type !== "chest") {
                        let autolingo_skill_container = document.createElement("DIV");
                        autolingo_skill_container.className = "start-autolingo-skill-container";
                        
                        skill_node.appendChild(autolingo_skill_container);

                        const lessonType = skill_metadata.type === "story" ? "story" : "lesson";

                        if (
                            skill_metadata.type === "story"
                            || !legendary_level_unlocked
                            || (legendary_level_unlocked && skill_metadata.hasLevelReview)
                        ) {
                            let start_autolingo_skill_tooltip = document.createElement("DIV");
                            start_autolingo_skill_tooltip.className = "tooltip";

                            let start_autolingo_skill = document.createElement("IMG");
                            start_autolingo_skill.src = tier_img_url
                            start_autolingo_skill.className = "start-autolingo-skill";
    
                            start_autolingo_skill.onclick = () => {
                                window.autolingo_autocomplete = true;
                                document.dispatchEvent(new CustomEvent("enable_autolingo_for_lesson"));
                                let ds = new DuolingoSkill(skill_node, lessonType);
                                ds.start('[data-test*="skill-path-state"]', false);
                            };
    
                            let start_autolingo_tooltip_text = document.createElement("SPAN");
                            start_autolingo_tooltip_text.innerHTML = `Autocomplete <strong>${skill_metadata.type}</strong> with AutoLingo.`;
                            start_autolingo_tooltip_text.className = "tooltip-text";
    
                            start_autolingo_skill_tooltip.appendChild(start_autolingo_tooltip_text);
                            start_autolingo_skill_tooltip.appendChild(start_autolingo_skill);
                            autolingo_skill_container.appendChild(start_autolingo_skill_tooltip);
                        }

                        if (legendary_level_unlocked) {
                            let final_autolingo_skill_tooltip = document.createElement("DIV");
                            final_autolingo_skill_tooltip.className = "tooltip";
    
                            // append a lil button to each skill
                            // when clicked, this button starts an auto-lesson
                            let final_autolingo_skill = document.createElement("IMG");
                            final_autolingo_skill.src = legendary_img_url;
                            final_autolingo_skill.className = "final-autolingo-skill";
    
                            // on click, final the lesson and let the extension know it's time to autocomplete
                            final_autolingo_skill.onclick = () => {
                                window.autolingo_autocomplete = true;
                                document.dispatchEvent(new CustomEvent("enable_autolingo_for_lesson"));
                                let ds = new DuolingoSkill(skill_node, lessonType);
                                ds.start('[data-test="legendary-node-button"]', true);                            
                            }
    
                            // show tooltip when hovering over the auto-lesson buttons
                            let final_autolingo_tooltip_text = document.createElement("SPAN");
                            final_autolingo_tooltip_text.innerHTML = `Autocomplete <strong>legendary ${skill_metadata.type}</strong> with AutoLingo.`;
                            final_autolingo_tooltip_text.className = "tooltip-text";
    
                            // append nodes to eachother
                            final_autolingo_skill_tooltip.appendChild(final_autolingo_tooltip_text);
                            final_autolingo_skill_tooltip.appendChild(final_autolingo_skill);
                            autolingo_skill_container.appendChild(final_autolingo_skill_tooltip);
                        }
                    }
                });
            }

            // iterate over all skills - only on pages that have the skill path
            const skillPath = document.querySelector('[data-test="skill-path"]');
            if (!skillPath) return;

            [...skillPath.querySelectorAll('[data-test*="skill-path-unit"]')]?.forEach(e => {
                processSkillNode(e);
            })

            // start observing the target node for configured mutations
            const targetNode = skillPath;
            const processedNodes = new Set();

            const observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (node.matches && node.matches('[data-test*="skill-path-unit"]') && !processedNodes.has(node)) {
                                processSkillNode(node);
                                processedNodes.add(node);
                            }
                        });
                    }
                }
            });

            const config = { childList: true, subtree: true };
            observer.observe(targetNode, config);
        }
    })
}
    
    

const set_hotkeys = () => {
    // window.log("hotkeys set")
    document.addEventListener("keydown", e => {
        // CTRL+ENTER to solve and skip the current challenge
        if (e.key === "Enter" && e.ctrlKey) {
            const challenge = new DuolingoChallenge();
            challenge.solve().then(() => {
                challenge.click_next();
                // challenge.click_next();
                window.autolingo.solving = false;
            }).catch(error => {
                console.error(error);
            });
        }

        // ALT+ENTER
        // solve the challenge (but show us the right answer too)
        if (e.key === "Enter" && e.altKey) {
            const challenge = new DuolingoChallenge();
            challenge.solve().then(() => {
                // challenge.click_next();
                // challenge.click_next();
                window.autolingo.solving = false;
            }).catch(error => {
                console.error(error);
            });
        }

        // ALT+S to skip the current challenge and fail it
        if (e.key === "s" && e.altKey) {
            document.querySelector("[data-test='player-skip']")?.click();
        }
    });
}

// get chrome extension's ID
document.addEventListener("extension_id", e => {
    const extension_id = `chrome-extension://${e.detail.data}`;

    // inject when we have the extension's ID
    inject(extension_id);
});

// ask for the chrome extension's ID
window.dispatchEvent(
    new CustomEvent("get_extension_id", { detail: null })
);

// Add event listener for delay changes
document.addEventListener("set_delay", (e) => {
    window.autolingo_delay = e.detail.data;
});

